"""
Live Dashboard — macOS Agent
Monitors the foreground window and reports app usage to the dashboard backend.

Requirements:
  pip install psutil requests rumps Pillow

Permissions:
  System Preferences → Privacy & Security → Accessibility → add Terminal (or your terminal app)
"""

import ctypes
import ipaddress
import json
import logging
import os
import socket
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path
import threading

import psutil
import requests
import rumps
import tkinter as tk
from tkinter import ttk


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
# macOS idle detection via Quartz Event Services
# ---------------------------------------------------------------------------
try:
    _carbon = ctypes.CDLL(
        "/System/Library/Frameworks/Carbon.framework/Versions/Current/Carbon"
    )
    _CGEventSourceSecondsSinceLastEventType = _carbon.CGEventSourceSecondsSinceLastEventType
    _CGEventSourceSecondsSinceLastEventType.argtypes = [ctypes.c_uint32, ctypes.c_uint32]
    _CGEventSourceSecondsSinceLastEventType.restype = ctypes.c_double
    _IDLE_AVAILABLE = True
except Exception as e:
    log.warning("Quartz idle detection unavailable: %s", e)
    _IDLE_AVAILABLE = False


def get_idle_seconds() -> float:
    if _IDLE_AVAILABLE:
        try:
            secs = _CGEventSourceSecondsSinceLastEventType(0, 0xFFFFFFFF)
            if secs >= 0:
                return secs
        except Exception as e:
            log.debug("CGEventSourceSecondsSinceLastEventType error: %s", e)
    return 0.0


# ---------------------------------------------------------------------------
# macOS foreground window info via AppleScript
# ---------------------------------------------------------------------------
_APPLESCRIPT_FOREGROUND = """\
tell application "System Events"
    set frontApp to first application process whose frontmost is true
    set appName to name of frontApp
    set windowTitle to ""
    try
        set windowTitle to name of front window of frontApp
    end try
    return appName & "|SEP|" & windowTitle
end tell
"""

_APPLESCRIPT_FULLSCREEN = """\
tell application "System Events"
    set frontApp to first application process whose frontmost is true
    try
        set isZoomed to zoomed of front window of frontApp
        return isZoomed as text
    on error
        try
            set screenBounds to bounds of window 1 of frontApp
            set winBounds to bounds of front window of frontApp
            return "unknown"
        end try
        return "false"
    end try
end tell
"""

_BACKGROUND_APP_BLACKLIST = {
    "dock", "finder", "systemuiserver", "loginwindow", "windowserver",
    "kernel_task", "launchd", "sysmond", "mds", "mdworker", "mds_stores",
    "coreauthd", "securityd", "cfprefsd", "distnoted", "rapportd",
    "nsurlsessiond", "nsurlstoraged", "chronoagent", "storekitagent",
    "callhistorypluginhelper", "cloudphotod", "com.apple.spotlight",
    "controlcenter", "controlcenterhelper", "siri", "dictionaryservicehelper",
    "safaribookmarkssyncagent",
}

_MUSIC_PROCESS_MAP = {
    "spotify": "Spotify",
    "music": "Apple Music",
    "qqmusic": "QQ音乐",
    "neteasemusic": "网易云音乐",
    "vlc": "VLC",
    "iina": "IINA",
}

_VIDEO_PROCESS_MAP = {
    "iina": "IINA",
    "vlc": "VLC",
}

_KNOWN_BACKGROUND_PROCESSES = {
    "wechat", "telegram", "discord", "qq", "feishu", "lark",
    "dingtalk", "skype", "slack", "zoom", "spotify", "neteasemusic",
}

_privacy_mode = False


def get_foreground_info() -> tuple[str, str] | None:
    try:
        result = subprocess.run(
            ["osascript", "-e", _APPLESCRIPT_FOREGROUND],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode != 0:
            log.debug("AppleScript foreground returned %d: %s", result.returncode, result.stderr.strip())
            return None
        output = result.stdout.strip()
        if "|SEP|" not in output:
            return None
        app_name, window_title = output.split("|SEP|", 1)
        app_name = app_name.strip()
        if not app_name:
            return None
        window_title = window_title.strip()

        if "桌面歌词" in window_title or "DesktopLyric" in window_title.lower():
            log.info("Skipping desktop lyric window as foreground")
            return None

        if app_name.lower() in _BACKGROUND_APP_BLACKLIST:
            log.info("Skipping blacklisted foreground process: %s", app_name)
            return None

        log.info(f"Foreground window: {app_name} - {window_title}")
        return app_name, window_title
    except subprocess.TimeoutExpired:
        log.debug("AppleScript foreground timed out")
        return None
    except Exception as e:
        log.error(f"Error in get_foreground_info: {str(e)}")
        return None


def is_fullscreen() -> bool:
    try:
        result = subprocess.run(
            ["osascript", "-e", _APPLESCRIPT_FULLSCREEN],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode != 0:
            return False
        output = result.stdout.strip().lower()
        if output == "true":
            return True
        return False
    except Exception:
        return False


def is_media_running() -> bool:
    try:
        for proc in psutil.process_iter(["name"]):
            name = proc.info.get("name", "").lower()
            if name in _MUSIC_PROCESS_MAP or name in _VIDEO_PROCESS_MAP:
                return True
    except Exception:
        pass
    return False


# ---------------------------------------------------------------------------
# Background app detection
# ---------------------------------------------------------------------------
_APPLESCRIPT_VISIBLE_WINDOWS = """\
tell application "System Events"
    set frontApp to name of first application process whose frontmost is true
    set output to ""
    repeat with proc in (every application process whose background only is false and visible is true)
        set procName to name of proc
        if procName is not frontApp then
            try
                set winTitle to name of front window of proc
                set output to output & procName & "|SEP|" & winTitle & "|REC|"
            on error
                set output to output & procName & "|SEP||REC|"
            end try
        end if
    end repeat
    return output
end tell
"""


def get_background_apps() -> list[dict]:
    background_apps: list[dict] = []
    try:
        result = subprocess.run(
            ["osascript", "-e", _APPLESCRIPT_VISIBLE_WINDOWS],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            records = result.stdout.strip().split("|REC|")
            for record in records:
                record = record.strip()
                if not record:
                    continue
                if "|SEP|" not in record:
                    continue
                proc_name, win_title = record.split("|SEP|", 1)
                proc_name = proc_name.strip()
                win_title = win_title.strip()
                if not proc_name:
                    continue
                if proc_name.lower() in _BACKGROUND_APP_BLACKLIST and proc_name.lower() not in _MUSIC_PROCESS_MAP and proc_name.lower() not in _VIDEO_PROCESS_MAP:
                    continue
                if "桌面歌词" in win_title or "DesktopLyric" in win_title:
                    continue
                background_apps.append({
                    "app_id": proc_name,
                    "window_title": win_title,
                })
                log.info(f"Background window: {proc_name} - {win_title}")
    except subprocess.TimeoutExpired:
        log.debug("AppleScript background windows timed out")
    except Exception as e:
        log.error(f"Error enumerating background windows: {str(e)}")

    psutil_apps = get_running_background_processes()
    existing_ids = {app["app_id"].lower() for app in background_apps}

    for app in psutil_apps:
        if app["app_id"].lower() not in existing_ids:
            background_apps.append(app)
            existing_ids.add(app["app_id"].lower())

    return background_apps


def get_running_background_processes() -> list[dict]:
    found = []
    seen = set()
    try:
        for proc in psutil.process_iter(["name"]):
            try:
                proc_name = proc.info["name"]
                if not proc_name:
                    continue
                proc_lower = proc_name.lower()
                if proc_lower in _KNOWN_BACKGROUND_PROCESSES and proc_lower not in seen:
                    seen.add(proc_lower)
                    found.append({
                        "app_id": proc_name,
                        "window_title": "",
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
    except Exception as e:
        log.error(f"Error scanning background processes: {e}")
    return found


# ---------------------------------------------------------------------------
# Music detection via AppleScript
# ---------------------------------------------------------------------------
_MUSIC_APPS = {
    "Spotify": """\
tell application "System Events"
    if not (exists process "Spotify") then return "NOT_RUNNING"
end tell
tell application "Spotify"
    if player state is not playing then return "NOT_PLAYING"
    set t to name of current track
    set a to artist of current track
    return t & "|SEP|" & a
end tell""",
    "Music": """\
tell application "System Events"
    if not (exists process "Music") then return "NOT_RUNNING"
end tell
tell application "Music"
    if player state is not playing then return "NOT_PLAYING"
    set t to name of current track
    set a to artist of current track
    return t & "|SEP|" & a
end tell""",
    "QQ音乐": """\
tell application "System Events"
    if not (exists process "QQMusic") then return "NOT_RUNNING"
    tell process "QQMusic"
        set t to title of front window
    end tell
    return t
end tell""",
    "网易云音乐": """\
tell application "System Events"
    if not (exists process "NeteaseMusic") then return "NOT_RUNNING"
    tell process "NeteaseMusic"
        set t to title of front window
    end tell
    return t
end tell""",
}


def get_music_info() -> dict | None:
    for app_name, script in _MUSIC_APPS.items():
        try:
            result = subprocess.run(
                ["osascript", "-e", script],
                capture_output=True, text=True, timeout=3,
            )
            if result.returncode != 0:
                continue
            output = result.stdout.strip()
            if output in ("NOT_RUNNING", "NOT_PLAYING", ""):
                continue

            info: dict[str, str] = {"app": app_name}
            if "|SEP|" in output:
                title, artist = output.split("|SEP|", 1)
                if title.strip():
                    info["title"] = title.strip()[:256]
                if artist.strip():
                    info["artist"] = artist.strip()[:256]
            else:
                if " - " in output:
                    song, artist = output.split(" - ", 1)
                    info["title"] = song.strip()[:256]
                    info["artist"] = artist.strip()[:256]
                else:
                    info["title"] = output[:256]
            return info
        except (subprocess.TimeoutExpired, Exception):
            continue
    return None


# ---------------------------------------------------------------------------
# Battery info
# ---------------------------------------------------------------------------
def get_battery_extra() -> dict:
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


# ---------------------------------------------------------------------------
# URL security validation
# ---------------------------------------------------------------------------
def validate_server_url(url: str) -> None:
    parsed = urllib.parse.urlparse(url)
    scheme = parsed.scheme.lower()
    hostname = parsed.hostname

    if scheme not in ("http", "https"):
        log.error("server_url must use http:// or https://")
        raise ValidationError("server_url must use http:// or https://")

    if not hostname:
        log.error("server_url has no valid hostname")
        raise ValidationError("server_url has no valid hostname")

    if scheme == "https":
        return

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
    MAX_BACKOFF = 60
    PAUSE_AFTER_FAILURES = 5
    PAUSE_DURATION = 300

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
        app_ids = []
        window_titles = []
        is_foregrounds = []

        for app in apps:
            app_ids.append(app["app_id"])
            window_titles.append(app["window_title"][:256])
            is_foregrounds.append(1 if app["is_foreground"] else 0)

        now = time.localtime()
        timestamp = f"{now.tm_year};{now.tm_mon:02d};{now.tm_mday:02d};{now.tm_hour:02d}:{now.tm_min:02d}"

        tz_offset = -time.timezone if time.daylight == 0 else -time.altzone

        payload = {
            "app_id": ";;".join(app_ids),
            "window_title": ";;".join(window_titles),
            "timestamp": timestamp,
            "is_foreground": ";;".join(map(str, is_foregrounds)),
            "tz": tz_offset,
        }
        if extra:
            payload["extra"] = extra
        try:
            resp = self.session.post(self.endpoint, json=payload, timeout=10)
            if resp.status_code in (200, 201, 409):
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
# Auto-start via LaunchAgents
# ---------------------------------------------------------------------------
_PLIST_NAME = "com.livedashboard.agent.plist"
_PLIST_LABEL = "com.livedashboard.agent"


def _get_plist_path() -> Path:
    return Path.home() / "Library" / "LaunchAgents" / _PLIST_NAME


def _get_agent_command() -> str:
    if getattr(sys, 'frozen', False):
        return f'"{sys.executable}"'
    return f'"{sys.executable}" "{Path(__file__).resolve()}"'


def is_startup_enabled() -> bool:
    plist_path = _get_plist_path()
    if not plist_path.exists():
        return False
    try:
        with open(plist_path, "r", encoding="utf-8") as f:
            content = f.read()
        return _PLIST_LABEL in content
    except Exception:
        return False


def toggle_startup() -> None:
    global _rumps_app
    if is_startup_enabled():
        try:
            subprocess.run(["launchctl", "unload", str(_get_plist_path())], capture_output=True, timeout=5)
            _get_plist_path().unlink(missing_ok=True)
            log.info("已禁用开机自启")
        except Exception as e:
            log.error(f"禁用开机自启失败: {str(e)}")
    else:
        try:
            plist_dir = _get_plist_path().parent
            plist_dir.mkdir(parents=True, exist_ok=True)
            command = _get_agent_command()
            plist_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{_PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{sys.executable}</string>
        <string>{Path(__file__).resolve()}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>{_LOG_DIR / "launch_stdout.log"}</string>
    <key>StandardErrorPath</key>
    <string>{_LOG_DIR / "launch_stderr.log"}</string>
</dict>
</plist>"""
            with open(_get_plist_path(), "w", encoding="utf-8") as f:
                f.write(plist_content)
            subprocess.run(["launchctl", "load", str(_get_plist_path())], capture_output=True, timeout=5)
            log.info("已启用开机自启")
        except Exception as e:
            log.error(f"启用开机自启失败: {str(e)}")


# ---------------------------------------------------------------------------
# Settings GUI
# ---------------------------------------------------------------------------
def show_settings():
    global _tk_root
    if _tk_root is None:
        _tk_root = tk.Tk()
        _tk_root.withdraw()
    root = tk.Toplevel(_tk_root)
    root.title("Live Dashboard Agent 设置")
    root.geometry("450x400")
    root.resizable(False, False)

    def on_close():
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)

    root.update_idletasks()
    width = root.winfo_width()
    height = root.winfo_height()
    x = (root.winfo_screenwidth() // 2) - (width // 2)
    y = (root.winfo_screenheight() // 2) - (height // 2)
    root.geometry(f"{width}x{height}+{x}+{y}")

    try:
        config = load_config()
    except Exception as e:
        log.error(f"Failed to load config: {str(e)}")
        config = {
            "server_url": "http://localhost:3000",
            "token": "",
            "interval_seconds": 5,
            "heartbeat_seconds": 60,
            "idle_threshold_seconds": 300,
        }

    frame = ttk.Frame(root, padding="20")
    frame.pack(fill=tk.BOTH, expand=True)

    ttk.Label(frame, text="服务器URL:").grid(row=0, column=0, padx=10, pady=10, sticky="e")
    server_url_var = tk.StringVar(value=config.get("server_url", "http://localhost:3000"))
    ttk.Entry(frame, textvariable=server_url_var, width=30).grid(row=0, column=1, padx=10, pady=10)

    ttk.Label(frame, text="Token:").grid(row=1, column=0, padx=10, pady=10, sticky="e")
    token_var = tk.StringVar(value=config.get("token", ""))
    ttk.Entry(frame, textvariable=token_var, width=30).grid(row=1, column=1, padx=10, pady=10)

    ttk.Label(frame, text="上报间隔(秒):").grid(row=2, column=0, padx=10, pady=10, sticky="e")
    interval_var = tk.IntVar(value=config.get("interval_seconds", 5))
    ttk.Entry(frame, textvariable=interval_var, width=10).grid(row=2, column=1, padx=10, pady=10, sticky="w")

    ttk.Label(frame, text="心跳间隔(秒):").grid(row=3, column=0, padx=10, pady=10, sticky="e")
    heartbeat_var = tk.IntVar(value=config.get("heartbeat_seconds", 60))
    ttk.Entry(frame, textvariable=heartbeat_var, width=10).grid(row=3, column=1, padx=10, pady=10, sticky="w")

    ttk.Label(frame, text="空闲阈值(秒):").grid(row=4, column=0, padx=10, pady=10, sticky="e")
    idle_var = tk.IntVar(value=config.get("idle_threshold_seconds", 300))
    ttk.Entry(frame, textvariable=idle_var, width=10).grid(row=4, column=1, padx=10, pady=10, sticky="w")

    def save_config():
        new_config = {
            "server_url": server_url_var.get(),
            "token": token_var.get(),
            "interval_seconds": interval_var.get(),
            "heartbeat_seconds": heartbeat_var.get(),
            "idle_threshold_seconds": idle_var.get(),
        }
        try:
            validate_server_url(new_config["server_url"])
        except (ValidationError, ValueError) as e:
            log.error("服务器URL无效: %s", e)
            return

        if not new_config["token"]:
            log.error("Token不能为空")
            return

        config_path = get_app_dir() / "config.json"
        try:
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(new_config, f, indent=2)
            log.info(f"配置已保存到: {config_path}")
            root.destroy()
        except Exception as e:
            log.error(f"保存配置失败: {str(e)}")

    ttk.Button(frame, text="保存", command=save_config).grid(row=5, column=1, padx=10, pady=20, sticky="e")

    root.update()
    _tk_root.mainloop()


# ---------------------------------------------------------------------------
# Menu bar app (rumps)
# ---------------------------------------------------------------------------
_rumps_app = None


class LiveDashboardApp(rumps.App):
    def __init__(self):
        super().__init__("LD", title=None, quit_button=None)
        self._online = False
        self._current_fg = ""

    @rumps.clicked("设置")
    def on_settings(self, _):
        log.info("Opening settings...")
        show_settings()

    @rumps.clicked("隐私模式")
    def on_privacy(self, sender):
        global _privacy_mode
        _privacy_mode = not _privacy_mode
        sender.state = _privacy_mode
        log.info("Privacy mode: %s", _privacy_mode)

    @rumps.clicked("开机自启")
    def on_startup(self, sender):
        toggle_startup()
        sender.state = is_startup_enabled()

    @rumps.clicked("退出")
    def on_quit(self, _):
        log.info("Exiting...")
        rumps.quit_application()

    def update_status(self, online: bool, fg_app: str = ""):
        self._online = online
        self._current_fg = fg_app
        if online:
            status = "🟢"
        else:
            status = "🔴"
        if fg_app:
            title = f"{status} {fg_app[:20]}"
        else:
            title = f"{status} LD"
        self.title = title


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def monitoring_loop():
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
                                "is_foreground": False,
                            }]
                            if reporter.send(apps, extra):
                                last_report_time = now
                        time.sleep(interval)
                        continue

                    info = get_foreground_info()

                    if info is None:
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
                                "is_foreground": True,
                            }]
                        else:
                            music = get_music_info()
                            if music:
                                extra["music"] = music
                            background_apps = get_background_apps()

                            apps = [{
                                "app_id": app_id,
                                "window_title": title,
                                "is_foreground": True,
                            }]
                            for bg_app in background_apps:
                                apps.append({
                                    "app_id": bg_app["app_id"],
                                    "window_title": bg_app["window_title"],
                                    "is_foreground": False,
                                })

                        success = reporter.send(apps, extra)
                        if success:
                            prev_app = app_id
                            prev_title = title
                            last_report_time = now
                            if changed:
                                log.info("Reported %d apps: foreground=%s — %s, background=%d apps", len(apps), app_id, title[:80], len(background_apps) if not _privacy_mode else 0)
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
            show_settings()
            time.sleep(5)


def _status_update_loop():
    global _rumps_app
    while True:
        try:
            is_online = False
            try:
                cfg = load_config()
                response = requests.get(cfg["server_url"] + "/api/health", timeout=5)
                is_online = response.status_code == 200
            except Exception:
                is_online = False

            fg_app = ""
            try:
                info = get_foreground_info()
                if info:
                    fg_app = info[0]
            except Exception:
                pass

            if _rumps_app:
                _rumps_app.update_status(is_online, fg_app)
        except Exception as e:
            log.debug("Status update error: %s", e)

        time.sleep(5)


def main() -> None:
    global _rumps_app
    log.info("Starting Live Dashboard macOS Agent")

    monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
    monitor_thread.start()
    log.info("Monitoring loop thread started")

    _rumps_app = LiveDashboardApp()

    status_thread = threading.Thread(target=_status_update_loop, daemon=True)
    status_thread.start()
    log.info("Status update thread started")

    _rumps_app.run()


if __name__ == "__main__":
    main()
