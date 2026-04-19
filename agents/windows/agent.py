"""
Live Dashboard — Windows Agent
Monitors the foreground window and reports app usage to the dashboard backend.
"""

import ctypes
import ctypes.wintypes
import ipaddress
import json
import logging
import os
import socket
import sys
import time
import urllib.parse
from pathlib import Path
import threading
import winreg

import psutil
import requests
import pystray
from PIL import Image, ImageDraw
import tkinter as tk
from tkinter import ttk, messagebox


def get_app_dir() -> Path:
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    return Path(__file__).parent


_tk_root = None


class ValidationError(Exception):
    pass


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
_LOG_DIR = get_app_dir()
_LOG_RETENTION_DAYS = 2


class DailyFileHandler(logging.FileHandler):
    def __init__(self, log_dir: Path, **kwargs):
        self._log_dir = log_dir
        self._current_date = ""
        kwargs["filename"] = self._get_log_path()
        super().__init__(kwargs.pop("filename"), **kwargs)
        self._current_date = self._today_str()

    def _today_str(self) -> str:
        return time.strftime("%Y-%m-%d")

    def _get_log_path(self) -> Path:
        return self._log_dir / f"agent_{self._today_str()}.log"

    def emit(self, record):
        today = self._today_str()
        if today != self._current_date:
            self._current_date = today
            self.close()
            self.baseFilename = str(self._get_log_path())
            self.stream = self._open()
            self._cleanup_old_logs()
        super().emit(record)

    def _cleanup_old_logs(self):
        cutoff = time.time() - _LOG_RETENTION_DAYS * 86400
        for f in self._log_dir.glob("agent_????-??-??.log"):
            try:
                if f.stat().st_mtime < cutoff:
                    f.unlink()
                    print(f"[log] Deleted old log: {f.name}")
            except OSError:
                pass


daily_handler = DailyFileHandler(_LOG_DIR, encoding="utf-8")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        daily_handler,
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("agent")
daily_handler._cleanup_old_logs()

# ---------------------------------------------------------------------------
# Win32 API bindings
# ---------------------------------------------------------------------------
user32 = ctypes.windll.user32  # type: ignore[attr-defined]
kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]

GetForegroundWindow = user32.GetForegroundWindow
GetForegroundWindow.restype = ctypes.wintypes.HWND

GetWindowTextW = user32.GetWindowTextW
GetWindowTextW.argtypes = [ctypes.wintypes.HWND, ctypes.wintypes.LPWSTR, ctypes.c_int]
GetWindowTextW.restype = ctypes.c_int

GetWindowTextLengthW = user32.GetWindowTextLengthW
GetWindowTextLengthW.argtypes = [ctypes.wintypes.HWND]
GetWindowTextLengthW.restype = ctypes.c_int

GetWindowThreadProcessId = user32.GetWindowThreadProcessId
GetWindowThreadProcessId.argtypes = [ctypes.wintypes.HWND, ctypes.POINTER(ctypes.wintypes.DWORD)]
GetWindowThreadProcessId.restype = ctypes.wintypes.DWORD


class RECT(ctypes.Structure):
    _fields_ = [
        ("left", ctypes.wintypes.LONG),
        ("top", ctypes.wintypes.LONG),
        ("right", ctypes.wintypes.LONG),
        ("bottom", ctypes.wintypes.LONG),
    ]

GetWindowRect = user32.GetWindowRect
GetWindowRect.argtypes = [ctypes.wintypes.HWND, ctypes.POINTER(RECT)]
GetWindowRect.restype = ctypes.wintypes.BOOL


class LASTINPUTINFO(ctypes.Structure):
    _fields_ = [
        ("cbSize", ctypes.wintypes.UINT),
        ("dwTime", ctypes.wintypes.DWORD),
    ]

GetLastInputInfo = user32.GetLastInputInfo
GetLastInputInfo.argtypes = [ctypes.POINTER(LASTINPUTINFO)]
GetLastInputInfo.restype = ctypes.wintypes.BOOL

GetTickCount = kernel32.GetTickCount
GetTickCount.restype = ctypes.wintypes.DWORD


def get_idle_seconds() -> float:
    """Return seconds since last keyboard/mouse input."""
    lii = LASTINPUTINFO()
    lii.cbSize = ctypes.sizeof(LASTINPUTINFO)
    if not GetLastInputInfo(ctypes.byref(lii)):
        return 0.0
    now = GetTickCount()
    elapsed_ms = (now - lii.dwTime) & 0xFFFFFFFF
    return elapsed_ms / 1000.0


def is_fullscreen() -> bool:
    """Check if the foreground window is fullscreen."""
    try:
        hwnd = GetForegroundWindow()
        if not hwnd:
            return False
        rect = RECT()
        if not GetWindowRect(hwnd, ctypes.byref(rect)):
            return False
        import ctypes.wintypes
        screen_w = user32.GetSystemMetrics(0)
        screen_h = user32.GetSystemMetrics(1)
        win_w = rect.right - rect.left
        win_h = rect.bottom - rect.top
        return win_w >= screen_w and win_h >= screen_h
    except Exception:
        return False


def is_media_running() -> bool:
    """Check if a music or video app is currently running."""
    try:
        for proc in psutil.process_iter(["name"]):
            name = proc.info.get("name", "").lower()
            if name in _MUSIC_PROCESS_MAP or name in _VIDEO_PROCESS_MAP:
                return True
    except Exception:
        pass
    return False


_privacy_mode = False


def get_foreground_info() -> tuple[str, str] | None:
    """Return (process_name, window_title) of the current foreground window,
    or None if no window / error."""
    try:
        hwnd = GetForegroundWindow()
        if not hwnd:
            log.info("No foreground window handle")
            return None

        # Window title
        length = GetWindowTextLengthW(hwnd)
        if length <= 0:
            log.info("No window title")
            return None
        buf = ctypes.create_unicode_buffer(length + 1)
        GetWindowTextW(hwnd, buf, length + 1)
        title = buf.value.strip()
        if not title:
            log.info("Empty window title")
            return None

        if "桌面歌词" in title or "DesktopLyric" in title.lower():
            log.info("Skipping desktop lyric window as foreground")
            return None

        pid = ctypes.wintypes.DWORD()
        GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        try:
            proc = psutil.Process(pid.value)
            proc_name = proc.name()
            proc_lower = proc.name().lower()
        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
            log.error(f"Failed to get process name: {str(e)}")
            proc_name = "unknown"
            proc_lower = ""

        if proc_lower in _BACKGROUND_APP_BLACKLIST:
            log.info("Skipping blacklisted foreground process: %s", proc_name)
            return None

        log.info(f"Foreground window: {proc_name} - {title}")
        return proc_name, title
    except Exception as e:
        log.error(f"Error in get_foreground_info: {str(e)}")
        import traceback
        log.error(traceback.format_exc())
        return None


# ---------------------------------------------------------------------------
# Music detection — scan ALL windows (not just foreground)
# ---------------------------------------------------------------------------
# EnumWindows callback type
WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.wintypes.BOOL, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)

EnumWindows = user32.EnumWindows
EnumWindows.argtypes = [WNDENUMPROC, ctypes.wintypes.LPARAM]
EnumWindows.restype = ctypes.wintypes.BOOL

IsWindowVisible = user32.IsWindowVisible
IsWindowVisible.argtypes = [ctypes.wintypes.HWND]
IsWindowVisible.restype = ctypes.wintypes.BOOL

# Known music apps: maps process-name-lowercase → app display name
_MUSIC_PROCESS_MAP: dict[str, str] = {
    "spotify.exe": "Spotify",
    "qqmusic.exe": "QQ音乐",
    "cloudmusic.exe": "网易云音乐",
    "foobar2000.exe": "foobar2000",
    "itunes.exe": "Apple Music",
    "applemusic.exe": "Apple Music",
    "kugou.exe": "酷狗音乐",
    "kwmusic.exe": "酷我音乐",
    "aimp.exe": "AIMP",
    "musicbee.exe": "MusicBee",
    "vlc.exe": "VLC",
    "potplayer.exe": "PotPlayer",
    "potplayer64.exe": "PotPlayer",
    "potplayermini.exe": "PotPlayer",
    "potplayermini64.exe": "PotPlayer",
    "wmplayer.exe": "Windows Media Player",
}

_VIDEO_PROCESS_MAP: dict[str, str] = {
    "mpc-hc.exe": "MPC-HC",
    "mpc-hc64.exe": "MPC-HC",
    "kmplayer.exe": "KMPlayer",
    "gomplayer.exe": "GOM Player",
    "5kplayer.exe": "5KPlayer",
}

# Title parsers: extract (title, artist) from window title for each app
def _parse_spotify_title(title: str) -> tuple[str, str] | None:
    """Spotify: 'Artist - Song' when playing, 'Spotify Free/Premium' when idle."""
    if title in ("Spotify", "Spotify Free", "Spotify Premium"):
        return None  # not playing
    if " - " in title:
        artist, song = title.split(" - ", 1)
        return song.strip(), artist.strip()
    return title, ""

def _parse_dash_title(title: str, app_suffix: str = "") -> tuple[str, str] | None:
    """Generic 'Song - Artist' parser (QQ音乐, 网易云, etc.)."""
    if app_suffix and title.rstrip() == app_suffix:
        return None  # idle
    if " - " in title:
        song, artist = title.split(" - ", 1)
        return song.strip(), artist.strip()
    return title, ""

def _parse_foobar_title(title: str) -> tuple[str, str] | None:
    """foobar2000: configurable, common format '[Artist - Song [foobar2000]]'."""
    # Strip trailing " [foobar2000]" or " [foobar2000 ...]"
    import re
    cleaned = re.sub(r"\s*\[foobar2000[^\]]*\]\s*$", "", title)
    if not cleaned or cleaned == title:
        # No foobar suffix found, or empty after stripping
        if " - " in title:
            parts = title.split(" - ", 1)
            return parts[1].strip(), parts[0].strip()
        return title, ""
    if " - " in cleaned:
        artist, song = cleaned.split(" - ", 1)
        return song.strip(), artist.strip()
    return cleaned, ""


def _is_media_process(proc_name: str) -> bool:
    lower = proc_name.lower()
    return lower in _MUSIC_PROCESS_MAP or lower in _VIDEO_PROCESS_MAP


def get_music_info() -> dict | None:
    """Scan all windows to find a known music player and extract now-playing info."""
    results: list[tuple[str, str, str]] = []  # (app, title, artist)

    def enum_callback(hwnd: int, _lParam: int) -> bool:
        if not IsWindowVisible(hwnd):
            return True
        length = GetWindowTextLengthW(hwnd)
        if length <= 0:
            return True
        buf = ctypes.create_unicode_buffer(length + 1)
        GetWindowTextW(hwnd, buf, length + 1)
        win_title = buf.value.strip()
        if not win_title:
            return True

        if "桌面歌词" in win_title or "DesktopLyric" in win_title.lower():
            return True

        pid = ctypes.wintypes.DWORD()
        GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        try:
            proc = psutil.Process(pid.value)
            proc_lower = proc.name().lower()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return True

        if proc_lower not in _MUSIC_PROCESS_MAP:
            return True

        app_name = _MUSIC_PROCESS_MAP[proc_lower]
        parsed = None
        if proc_lower == "spotify.exe":
            parsed = _parse_spotify_title(win_title)
        elif proc_lower == "foobar2000.exe":
            parsed = _parse_foobar_title(win_title)
        elif proc_lower in ("qqmusic.exe", "cloudmusic.exe", "kugou.exe", "kwmusic.exe"):
            parsed = _parse_dash_title(win_title)
        else:
            parsed = _parse_dash_title(win_title)

        if parsed:
            song, artist = parsed
            results.append((app_name, song, artist))
        return True

    try:
        EnumWindows(WNDENUMPROC(enum_callback), 0)
    except Exception as e:
        log.debug("EnumWindows error: %s", e)
        return None

    if not results:
        return None

    app, title, artist = results[0]
    info: dict[str, str] = {"app": app}
    if title:
        info["title"] = title[:256]
    if artist:
        info["artist"] = artist[:256]
    return info


def get_battery_extra() -> dict:
    """Return battery info dict, or empty dict if no battery (desktop PC)."""
    try:
        battery = psutil.sensors_battery()
        if battery is None:
            return {}
        return {
            "battery_percent": int(battery.percent),
            "battery_charging": bool(battery.power_plugged),
        }
    except Exception:
        return {}


_BACKGROUND_APP_BLACKLIST = {
    "powertoys.quickaccess.exe",
    "nahimic3.exe",
    "nahimic2.exe",
    "nahimic64.exe",
    "microsoft.cmdpal.ui.exe",
    "searchhost.exe",
    "shellexperiencehost.exe",
    "startmenuexperiencehost.exe",
    "applicationframehost.exe",
    "backgroundtaskhost.exe",
    "taskhostw.exe",
    "sihost.exe",
    "fontdrvhost.exe",
    "ctfmon.exe",
    "dllhost.exe",
    "werfault.exe",
    "winstore.app.exe",
    "searchui.exe",
    "runtimebroker.exe",
    "securityhealthsystray.exe",
    "securityhealthservice.exe",
    "smartscreen.exe",
    "sogoucloud.exe",
    "sogoupy.exe",
    "sogoupy.ime",
    "mspy.exe",
    "inputmethodhost.exe",
    "imetool.exe",
    "chsunime.exe",
    "pfutime.exe",
    "msctf.exe",
    "ctfmon.exe",
    "inputpersonalization.exe",
    "searchindexer.exe",
    "textinputhost.exe",
    "shellhost.exe",
}


def get_background_apps() -> list[dict]:
    """Return list of background applications with their info."""
    background_apps: list[dict] = []
    try:
        foreground_hwnd = GetForegroundWindow()
        log.info(f"Foreground window handle: {foreground_hwnd}")

        def enum_callback(hwnd: int, _lParam: int) -> bool:
            if hwnd == foreground_hwnd:
                return True
            if not IsWindowVisible(hwnd):
                return True
            length = GetWindowTextLengthW(hwnd)
            if length <= 0:
                return True
            buf = ctypes.create_unicode_buffer(length + 1)
            GetWindowTextW(hwnd, buf, length + 1)
            win_title = buf.value.strip()
            if not win_title:
                return True

            if "桌面歌词" in win_title or "DesktopLyric" in win_title:
                return True

            if win_title == "Program Manager":
                return True

            pid = ctypes.wintypes.DWORD()
            GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            try:
                proc = psutil.Process(pid.value)
                proc_name = proc.name()
                proc_lower = proc.name().lower()
            except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                log.debug(f"Failed to get process for window: {str(e)}")
                return True

            if proc_lower in _BACKGROUND_APP_BLACKLIST and not _is_media_process(proc_lower):
                return True

            rect = RECT()
            if GetWindowRect(hwnd, ctypes.byref(rect)):
                width = rect.right - rect.left
                height = rect.bottom - rect.top
                if (width < 50 or height < 50) and not _is_media_process(proc_lower):
                    return True

            background_apps.append({
                "app_id": proc_name,
                "window_title": win_title
            })
            log.info(f"Background window: {proc_name} - {win_title}")
            return True

        try:
            log.info("Enumerating windows...")
            EnumWindows(WNDENUMPROC(enum_callback), 0)
            log.info(f"Found {len(background_apps)} background windows")
        except Exception as e:
            log.error(f"EnumWindows error in get_background_apps: {str(e)}")
            import traceback
            log.error(traceback.format_exc())
    except Exception as e:
        log.error(f"Error in get_background_apps: {str(e)}")
        import traceback
        log.error(traceback.format_exc())

    return background_apps


# ---------------------------------------------------------------------------
# URL security validation
# ---------------------------------------------------------------------------
def validate_server_url(url: str) -> None:
    """Validate server_url security: HTTPS always allowed, HTTP only for private networks."""
    parsed = urllib.parse.urlparse(url)
    scheme = parsed.scheme.lower()
    hostname = parsed.hostname

    if scheme not in ("http", "https"):
        log.error("server_url must use http:// or https://")
        raise ValidationError("server_url must use http:// or https://")

    if not hostname:
        log.error("server_url has no valid hostname")
        raise ValidationError("server_url has no valid hostname")

    # HTTPS is always safe (token encrypted in transit)
    if scheme == "https":
        return

    # HTTP — resolve hostname and check ALL IPs are private
    try:
        addrinfos = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror as e:
        log.error("Cannot resolve hostname '%s': %s", hostname, e)
        raise ValidationError(f"Cannot resolve hostname '{hostname}'")

    ips = {info[4][0] for info in addrinfos}
    for ip_str in ips:
        ip = ipaddress.ip_address(ip_str)
        if ip.is_global:
            log.error(
                "HTTP refused: hostname resolves to public IP. Use HTTPS for public servers.",
            )
            raise ValidationError("HTTP refused: hostname resolves to public IP. Use HTTPS for public servers.")

    log.warning(
        "HTTP allowed for private network (%s). Token sent in plaintext!",
        hostname,
    )


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
def load_config(show_error=False) -> dict:
    """Load config.json from the current working directory."""
    config_path = get_app_dir() / "config.json"
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    except FileNotFoundError:
        config_path = Path(".").resolve() / "config.json"
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
        except FileNotFoundError:
            config_path = Path(__file__).with_name("config.json")
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
            except FileNotFoundError:
                if show_error:
                    log.error("config.json not found")
                raise
    except PermissionError:
        if show_error:
            log.error("config.json: permission denied — %s", config_path)
        raise
    except json.JSONDecodeError as e:
        if show_error:
            log.error("config.json: invalid JSON — %s", e)
        raise

    if not isinstance(cfg, dict):
        if show_error:
            log.error("config.json: expected a JSON object, got %s", type(cfg).__name__)
        raise ValueError("config.json: expected a JSON object")

    # Validate required fields
    required = ("server_url", "token")
    for key in required:
        if not cfg.get(key) or cfg[key] == "YOUR_TOKEN_HERE":
            if show_error:
                log.error("config.json: '%s' is not set", key)
            raise ValueError(f"config.json: '{key}' is not set")

    try:
        validate_server_url(cfg["server_url"])
    except ValidationError as e:
        if show_error:
            log.error("Config validation error: %s", e)
        raise

    # Validate numeric fields with sane defaults
    for key, default, lo, hi in [
        ("interval_seconds", 5, 1, 300),
        ("heartbeat_seconds", 60, 10, 600),
        ("idle_threshold_seconds", 300, 30, 3600),
    ]:
        val = cfg.get(key, default)
        if not isinstance(val, (int, float)) or val < lo or val > hi:
            log.warning("config.json: '%s' invalid (%r), using %d", key, val, default)
            val = default
        cfg[key] = int(val)

    return cfg


# ---------------------------------------------------------------------------
# Reporter
# ---------------------------------------------------------------------------
class Reporter:
    """Handles sending reports to the backend with exponential backoff."""

    MAX_BACKOFF = 60  # seconds
    PAUSE_AFTER_FAILURES = 5  # consecutive failures before long pause
    PAUSE_DURATION = 300  # 5 minutes

    def __init__(self, server_url: str, token: str):
        self.endpoint = server_url.rstrip("/") + "/api/report"
        self.token = token
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        })
        self._consecutive_failures = 0
        self._current_backoff = 0

    def send(self, apps: list[dict], extra: dict | None = None) -> bool:
        """Send a report. Returns True on success."""
        # Prepare data for multiple apps
        app_ids = []
        window_titles = []
        is_foregrounds = []

        for app in apps:
            app_ids.append(app["app_id"])
            window_titles.append(app["window_title"][:256])
            is_foregrounds.append(1 if app["is_foreground"] else 0)

        # Format timestamp as 年;月;日;xx:xx
        now = time.localtime()
        timestamp = f"{now.tm_year};{now.tm_mon:02d};{now.tm_mday:02d};{now.tm_hour:02d}:{now.tm_min:02d}"

        payload = {
            "app_id": ";;".join(app_ids),
            "window_title": ";;".join(window_titles),
            "timestamp": timestamp,
            "is_foreground": ";;".join(map(str, is_foregrounds)),
        }
        if extra:
            payload["extra"] = extra
        try:
            resp = self.session.post(self.endpoint, json=payload, timeout=10)
            if resp.status_code in (200, 201, 409):
                # 409 = duplicate, still counts as success
                self._consecutive_failures = 0
                self._current_backoff = 0
                return True
            log.warning("Server returned %d: %s", resp.status_code, resp.text[:200])
        except requests.RequestException as e:
            log.warning("Request failed: %s", e)

        self._consecutive_failures += 1
        if self._current_backoff == 0:
            self._current_backoff = 5
        else:
            self._current_backoff = min(self._current_backoff * 2, self.MAX_BACKOFF)

        if self._consecutive_failures >= self.PAUSE_AFTER_FAILURES:
            log.warning(
                "Failed %d times in a row, pausing %ds",
                self._consecutive_failures,
                self.PAUSE_DURATION,
            )
            time.sleep(self.PAUSE_DURATION)
            self._consecutive_failures = 0
            self._current_backoff = 0
        return False

    @property
    def backoff(self) -> float:
        return self._current_backoff


# ---------------------------------------------------------------------------
# System Tray and Settings
# ---------------------------------------------------------------------------
def create_status_icon(is_online):
    """Create status icon based on online status."""
    # Create a simple icon with status indicator
    image = Image.new('RGB', (64, 64), color=(240, 240, 240))
    d = ImageDraw.Draw(image)

    # Draw background
    d.rectangle([0, 0, 63, 63], fill=(240, 240, 240))

    # Draw status dot
    status_color = (76, 175, 80) if is_online else (158, 158, 158)
    d.ellipse([20, 20, 44, 44], fill=status_color)

    # Draw LD text
    d.text((10, 48), "LD", fill=(73, 109, 137))

    return image


def create_tray_icon():
    """Create system tray icon with dynamic status."""
    log.info("Creating system tray icon...")

    # Create initial icon
    try:
        initial_image = create_status_icon(False)
        log.info("Initial icon created")
    except Exception as e:
        log.error(f"Failed to create initial icon: {str(e)}")
        return None

    # Define tray menu
    def exit_action(icon, item):
        log.info("Exiting...")
        icon.stop()
        import os
        os._exit(0)

    def open_settings(icon, item):
        log.info("Opening settings...")
        show_settings()

    def toggle_startup_action(icon, item):
        log.info("Toggling startup...")
        toggle_startup(icon, item)

    def toggle_privacy(icon, item):
        global _privacy_mode
        _privacy_mode = not _privacy_mode
        log.info("Privacy mode: %s", _privacy_mode)

    try:
        menu = pystray.Menu(
            pystray.MenuItem("设置", open_settings),
            pystray.MenuItem("开机自启", toggle_startup_action, checked=lambda item: is_startup_enabled()),
            pystray.MenuItem("隐私模式", toggle_privacy, checked=lambda item: _privacy_mode),
            pystray.MenuItem("退出", exit_action)
        )
        log.info("Menu created")
    except Exception as e:
        log.error(f"Failed to create menu: {str(e)}")
        return None

    # Create initial tooltip
    initial_tooltip = "Live Dashboard Agent\n状态: 离线\n\n当前运行的程序:\n无"

    # Create tray icon
    try:
        icon = pystray.Icon("live-dashboard-agent", initial_image, initial_tooltip, menu)
        log.info("Tray icon created")
    except Exception as e:
        log.error(f"Failed to create tray icon: {str(e)}")
        return None

    # Start status updates in a separate thread
    def update_status():
        log.info("Starting status update thread...")
        while True:
            try:
                # Check if server is reachable
                is_online = False
                try:
                    cfg = load_config()
                    import requests
                    response = requests.get(cfg["server_url"] + "/api/health", timeout=5)
                    is_online = response.status_code == 200
                except Exception as e:
                    is_online = False
                    log.error(f"Failed to check server status: {str(e)}")

                # Get current apps
                current_apps = []
                try:
                    # Get foreground app
                    log.info("Getting foreground app...")
                    fg_info = get_foreground_info()
                    if fg_info:
                        app_id, title = fg_info
                        current_apps.append(f"前台: {app_id} - {title[:30]}")
                        log.info(f"Foreground app: {app_id} - {title[:30]}")
                    else:
                        log.info("No foreground app found")
                    # Get background apps (limit to 3)
                    log.info("Getting background apps...")
                    bg_apps = get_background_apps()
                    log.info(f"Found {len(bg_apps)} background apps")
                    for i, bg_app in enumerate(bg_apps[:3]):
                        current_apps.append(f"后台: {bg_app['app_id']} - {bg_app['window_title'][:30]}")
                        log.info(f"Background app {i+1}: {bg_app['app_id']} - {bg_app['window_title'][:30]}")
                    if len(bg_apps) > 3:
                        current_apps.append(f"... 还有 {len(bg_apps) - 3} 个后台应用")
                except Exception as e:
                    log.error(f"Failed to get app info: {str(e)}")
                    import traceback
                    log.error(traceback.format_exc())
                    current_apps = ["无法获取应用信息"]

                # Update icon and tooltip
                try:
                    # Update icon status
                    icon.icon = create_status_icon(is_online)
                    # Update tooltip with limited length
                    base_tooltip = f"Live Dashboard Agent\n状态: {'在线' if is_online else '离线'}\n\n当前运行的程序:\n"
                    if current_apps:
                        # Limit the number of apps shown and truncate long app names
                        limited_apps = []
                        for app in current_apps[:3]:  # Only show first 3 apps
                            if len(app) > 40:  # Truncate long app names
                                app = app[:37] + "..."
                            limited_apps.append(app)
                        if len(current_apps) > 3:
                            limited_apps.append(f"... 还有 {len(current_apps) - 3} 个应用")
                        app_text = "\n".join(limited_apps)
                    else:
                        app_text = "无"

                    # Combine and truncate to 128 characters
                    new_tooltip = base_tooltip + app_text
                    if len(new_tooltip) > 128:
                        # Truncate to 125 characters and add ellipsis
                        new_tooltip = new_tooltip[:125] + "..."

                    # Update tooltip
                    icon.title = new_tooltip
                    # Log the update
                    log.info(f"Updated tray icon status: {'在线' if is_online else '离线'}")
                    log.info(f"Current apps: {current_apps}")
                    log.info(f"Tooltip: {new_tooltip}")
                    log.info(f"Tooltip length: {len(new_tooltip)}")
                except Exception as e:
                    log.error(f"Failed to update icon: {str(e)}")
            except Exception as e:
                log.error(f"Unexpected error in update_status: {str(e)}")
                import traceback
                log.error(traceback.format_exc())

            # Wait before next update
            import time
            time.sleep(5)

    # Start status update thread
    try:
        import threading
        update_thread = threading.Thread(target=update_status, daemon=True)
        update_thread.start()
        log.info("Status update thread started")
    except Exception as e:
        log.error(f"Failed to start status update thread: {str(e)}")

    return icon


def show_settings():
    """Show settings window."""
    global _tk_root
    if _tk_root is None:
        _tk_root = tk.Tk()
        _tk_root.withdraw()
    root = tk.Toplevel(_tk_root)
    root.title("Live Dashboard Agent 设置")
    root.geometry("450x400")
    root.resizable(False, False)

    # Ensure window can be closed
    def on_close():
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)

    # Center window
    root.update_idletasks()
    width = root.winfo_width()
    height = root.winfo_height()
    x = (root.winfo_screenwidth() // 2) - (width // 2)
    y = (root.winfo_screenheight() // 2) - (height // 2)
    root.geometry(f"{width}x{height}+{x}+{y}")

    # Load current config
    try:
        config = load_config()
    except Exception as e:
        # Config not found or invalid, create default
        log.error(f"Failed to load config: {str(e)}")
        config = {
            "server_url": "http://localhost:3000",
            "token": "",
            "interval_seconds": 5,
            "heartbeat_seconds": 60,
            "idle_threshold_seconds": 300
        }

    # Create input fields
    frame = ttk.Frame(root, padding="20")
    frame.pack(fill=tk.BOTH, expand=True)

    # Server URL
    ttk.Label(frame, text="服务器URL:").grid(row=0, column=0, padx=10, pady=10, sticky="e")
    server_url_var = tk.StringVar(value=config.get("server_url", "http://localhost:3000"))
    ttk.Entry(frame, textvariable=server_url_var, width=30).grid(row=0, column=1, padx=10, pady=10)

    # Token
    ttk.Label(frame, text="Token:").grid(row=1, column=0, padx=10, pady=10, sticky="e")
    token_var = tk.StringVar(value=config.get("token", ""))
    ttk.Entry(frame, textvariable=token_var, width=30).grid(row=1, column=1, padx=10, pady=10)

    # Interval seconds
    ttk.Label(frame, text="上报间隔(秒):").grid(row=2, column=0, padx=10, pady=10, sticky="e")
    interval_var = tk.IntVar(value=config.get("interval_seconds", 5))
    ttk.Entry(frame, textvariable=interval_var, width=10).grid(row=2, column=1, padx=10, pady=10, sticky="w")

    # Heartbeat seconds
    ttk.Label(frame, text="心跳间隔(秒):").grid(row=3, column=0, padx=10, pady=10, sticky="e")
    heartbeat_var = tk.IntVar(value=config.get("heartbeat_seconds", 60))
    ttk.Entry(frame, textvariable=heartbeat_var, width=10).grid(row=3, column=1, padx=10, pady=10, sticky="w")

    # Idle threshold seconds
    ttk.Label(frame, text="空闲阈值(秒):").grid(row=4, column=0, padx=10, pady=10, sticky="e")
    idle_var = tk.IntVar(value=config.get("idle_threshold_seconds", 300))
    ttk.Entry(frame, textvariable=idle_var, width=10).grid(row=4, column=1, padx=10, pady=10, sticky="w")

    # Save button
    def save_config():
        new_config = {
            "server_url": server_url_var.get(),
            "token": token_var.get(),
            "interval_seconds": interval_var.get(),
            "heartbeat_seconds": heartbeat_var.get(),
            "idle_threshold_seconds": idle_var.get()
        }

        # Validate config
        try:
            validate_server_url(new_config["server_url"])
        except (ValidationError, ValueError) as e:
            log.error("服务器URL无效: %s", e)
            return

        if not new_config["token"]:
            # 不显示弹窗，直接在控制台输出错误
            log.error("Token不能为空")
            return

        # Save config
        config_path = get_app_dir() / "config.json"
        try:
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(new_config, f, indent=2)
            # 不显示弹窗，直接在控制台输出成功信息
            log.info(f"配置已保存到: {config_path}")
            root.destroy()
        except Exception as e:
            # 不显示弹窗，直接在控制台输出错误
            log.error(f"保存配置失败: {str(e)}")

    ttk.Button(frame, text="保存", command=save_config).grid(row=5, column=1, padx=10, pady=20, sticky="e")

    # Force update to ensure window is visible
    root.update()
    _tk_root.mainloop()


def _get_startup_command() -> str:
    if getattr(sys, 'frozen', False):
        return f'"{sys.executable}"'
    return f'"{sys.executable}" "{Path(__file__).resolve()}"'


def is_startup_enabled():
    """Check if startup is enabled."""
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0,
            winreg.KEY_READ
        )
        value, _ = winreg.QueryValueEx(key, "Live Dashboard Agent")
        winreg.CloseKey(key)
        expected = _get_startup_command()
        if value == expected:
            return True
        exe_name = Path(sys.executable).name.lower()
        if value.lower().endswith(exe_name):
            return True
        return False
    except FileNotFoundError:
        return False


def toggle_startup(icon, item):
    """Toggle startup on/off."""
    if is_startup_enabled():
        # Disable startup
        try:
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                0,
                winreg.KEY_SET_VALUE
            )
            winreg.DeleteValue(key, "Live Dashboard Agent")
            winreg.CloseKey(key)
            # 不显示弹窗，直接在控制台输出信息
            log.info("已禁用开机自启")
        except Exception as e:
            # 不显示弹窗，直接在控制台输出错误
            log.error(f"禁用开机自启失败: {str(e)}")
    else:
        # Enable startup
        try:
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion\Run",
                0,
                winreg.KEY_SET_VALUE
            )
            winreg.SetValueEx(
                key,
                "Live Dashboard Agent",
                0,
                winreg.REG_SZ,
                _get_startup_command()
            )
            winreg.CloseKey(key)
            # 不显示弹窗，直接在控制台输出信息
            log.info("已启用开机自启")
        except Exception as e:
            # 不显示弹窗，直接在控制台输出错误
            log.error(f"启用开机自启失败: {str(e)}")


def show_first_run_setup():
    """Show first run setup wizard."""
    config_path = get_app_dir() / "config.json"
    if not config_path.exists():
        show_settings()


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def monitoring_loop():
    """Main monitoring loop."""
    while True:
        try:
            cfg = load_config(show_error=True)
            reporter = Reporter(cfg["server_url"], cfg["token"])

            interval = cfg["interval_seconds"]
            heartbeat_interval = cfg["heartbeat_seconds"]
            idle_threshold = cfg["idle_threshold_seconds"]

            prev_app: str | None = None
            prev_title: str | None = None
            last_report_time: float = 0
            was_idle = False

            log.info(
                "Monitoring started — interval=%ds, heartbeat=%ds, idle=%ds, server=%s",
                interval,
                heartbeat_interval,
                idle_threshold,
                cfg["server_url"],
            )

            while True:
                try:
                    now = time.time()

                    # AFK detection: if no input for idle_threshold, only send heartbeats
                    idle_secs = get_idle_seconds()
                    skip_idle = is_fullscreen() or is_media_running()
                    is_idle = idle_secs >= idle_threshold and not skip_idle

                    if is_idle and not was_idle:
                        log.info("User idle (%.0fs), switching to heartbeat-only", idle_secs)
                        was_idle = True
                    elif not is_idle and was_idle:
                        log.info("User returned after idle")
                        was_idle = False
                        prev_app = None
                        prev_title = None

                    if is_idle:
                        heartbeat_due = (now - last_report_time) >= heartbeat_interval
                        if heartbeat_due:
                            extra = get_battery_extra()
                            apps = [{
                                "app_id": "用户离开",
                                "window_title": "挂机中",
                                "is_foreground": False
                            }]
                            if reporter.send(apps, extra):
                                last_report_time = now
                        time.sleep(interval)
                        continue

                    info = get_foreground_info()

                    if info is None:
                        # No foreground window (lock screen, desktop, etc.)
                        time.sleep(interval)
                        continue

                    app_id, title = info
                    changed = app_id != prev_app or title != prev_title
                    heartbeat_due = (now - last_report_time) >= heartbeat_interval

                    if changed or heartbeat_due:
                        extra = get_battery_extra()

                        if _privacy_mode:
                            apps = [{
                                "app_id": "设备运行",
                                "window_title": "你猜",
                                "is_foreground": True
                            }]
                        else:
                            music = get_music_info()
                            if music:
                                extra["music"] = music
                            background_apps = get_background_apps()

                            apps = []
                            apps.append({
                                "app_id": app_id,
                                "window_title": title,
                                "is_foreground": True
                            })
                            for bg_app in background_apps:
                                apps.append({
                                    "app_id": bg_app["app_id"],
                                    "window_title": bg_app["window_title"],
                                    "is_foreground": False
                                })

                        # Send all apps in one report
                        success = reporter.send(apps, extra)
                        if success:
                            prev_app = app_id
                            prev_title = title
                            last_report_time = now
                            if changed:
                                log.info("Reported %d apps: foreground=%s — %s, background=%d apps", len(apps), app_id, title[:80], len(background_apps))
                        elif reporter.backoff > 0:
                            time.sleep(reporter.backoff)
                            continue

                    time.sleep(interval)

                except KeyboardInterrupt:
                    log.info("Shutting down monitoring loop")
                    return
                except Exception as e:
                    log.error("Unexpected error in monitoring loop: %s", e, exc_info=True)
                    time.sleep(interval)
        except Exception as e:
            log.error("Failed to load config or start monitoring: %s", e, exc_info=True)
            # Show settings if config is missing or invalid
            show_settings()
            # Wait before retrying
            time.sleep(5)


def main() -> None:
    log.info("Starting Live Dashboard Windows Agent")

    try:
        # Start monitoring loop in a separate thread
        log.info("Starting monitoring loop thread")
        monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
        monitor_thread.start()
        log.info("Monitoring loop thread started")

        # Start system tray
        log.info("Creating system tray icon")
        icon = create_tray_icon()
        if icon is None:
            log.error("Failed to create system tray icon, running in background")
            # Keep the program running
            while True:
                import time
                time.sleep(1)
        else:
            log.info("System tray icon created, starting run loop")
            icon.run()
            log.info("System tray icon run loop exited")
    except Exception as e:
        log.error("Unexpected error in main: %s", e, exc_info=True)
        # Keep the program running even if there's an error
        while True:
            import time
            time.sleep(1)
    finally:
        log.info("Agent stopped")


if __name__ == "__main__":
    main()
