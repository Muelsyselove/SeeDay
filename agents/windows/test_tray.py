import pystray
from PIL import Image, ImageDraw
import time

# Create a simple icon
def create_icon():
    image = Image.new('RGB', (64, 64), color=(240, 240, 240))
    d = ImageDraw.Draw(image)
    d.ellipse([20, 20, 44, 44], fill=(76, 175, 80))
    d.text((10, 48), "LD", fill=(73, 109, 137))
    return image

# Define menu functions
def on_exit(icon, item):
    icon.stop()

# Create tray icon
def main():
    image = create_icon()
    menu = pystray.Menu(
        pystray.MenuItem("退出", on_exit)
    )
    icon = pystray.Icon("test-tray", image, "Test Tray", menu)
    icon.run()

if __name__ == "__main__":
    main()
