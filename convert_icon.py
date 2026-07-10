from PIL import Image
import os

jpg_path = r"C:\Users\Death_God\.gemini\antigravity\brain\8afd35cb-dc87-4cc0-8c10-91043e97ca80\media__1783521924161.jpg"
png_path = r"C:\Users\Death_God\Downloads\projects\PDF OPENER\pdf-opener-pro\src-tauri\icons\app-icon.png"

img = Image.open(jpg_path)
img = img.convert("RGBA")
img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
img.save(png_path, format="PNG")
print("New logo converted successfully!")
