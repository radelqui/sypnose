---
name: capcut-video
description: Crear videos completos en CapCut Desktop programaticamente — de principio a fin. Desde crear draft hasta exportar MP4. Usa VectCutAPI (localhost:9002) para montar video con clips, musica, textos animados, transiciones, efectos, keyframes, subtitulos. Luego exporta automaticamente con Ctrl+E + pywinauto.
user_invocable: true
---

# CapCut Video — Crear Videos de Principio a Fin

## REQUISITOS
- VectCutAPI corriendo: `C:\Carlos\tools\start-capcut-api.bat` (puerto 9002)
- CapCut Desktop abierto
- Python: `pip install pyautogui pywinauto pillow psutil requests`

## API BASE
```
http://localhost:9002
```

## FLUJO COMPLETO (9 pasos)

### Paso 1: Crear draft
```python
import requests
API = "http://localhost:9002"

draft = requests.post(f"{API}/create_draft", json={
    "width": 1920,   # horizontal
    "height": 1080
}).json()
draft_id = draft["output"]["draft_id"]
```

Resoluciones: `1920x1080` (horizontal), `1080x1920` (vertical/TikTok), `1080x1080` (cuadrado)

### Paso 2: Agregar video clips
```python
requests.post(f"{API}/add_video", json={
    "draft_id": draft_id,
    "video_url": "C:/ruta/al/video.mp4",
    "start": 0,           # desde donde cortar el clip
    "end": 10,             # hasta donde
    "target_start": 0,     # donde ponerlo en la timeline
    "volume": 0.5,
    "transition": "fade_in",        # transicion de entrada
    "transition_duration": 0.5,
    "track_name": "main"
})
```

Transiciones disponibles: `fade_in`, `wipe_left`, `wipe_right`, `wipe_up`, `wipe_down`

### Paso 3: Agregar imagenes como slides
```python
requests.post(f"{API}/add_image", json={
    "draft_id": draft_id,
    "image_url": "C:/ruta/imagen.png",
    "start": 0,
    "end": 5,              # duracion del slide
    "width": 1920,
    "height": 1080,
    "intro_animation": "Fade_In",     # animacion de entrada
    "outro_animation": "Zoom_Out",    # animacion de salida
    "transition": "fade_in"
})
```

Animaciones de entrada: `Fade_In`, `Zoom_1`, `Zoom_2`, `Zoom_In`, `Zoom_Out`, `Slide_Down`, `Slide_Up`, `Slide_Right`, `Slide_Left`, `Rotate`, `Screen_Wipe`, `Flip`, `Shake_1`, `Swing`, `Blinds`, `Puzzle`

### Paso 4: Agregar musica de fondo
```python
requests.post(f"{API}/add_audio", json={
    "draft_id": draft_id,
    "audio_url": "C:/ruta/musica.mp3",
    "volume": 0.3,
    "speed": 1.0,
    "track_name": "audio_main"
})
```

### Paso 5: Agregar textos animados
```python
requests.post(f"{API}/add_text", json={
    "draft_id": draft_id,
    "text": "SYPNOSE",
    "start": 0,
    "end": 5,
    "font_size": 64,
    "font_color": "#da7756",
    "shadow_enabled": True,
    "shadow_color": "#000000",
    "shadow_distance": 10,
    "background_color": "#000000",
    "background_alpha": 0.7,
    "background_round_radius": 20,
    "text_intro": "fade_in",      # animacion de entrada del texto
    "text_outro": "zoom_out"       # animacion de salida del texto
})
```

Animaciones de texto: `fade_in`, `fade_out`, `zoom_in`, `zoom_out`, `slide_left`, `slide_right`

### Paso 6: Agregar subtitulos SRT
```python
requests.post(f"{API}/add_subtitle", json={
    "draft_id": draft_id,
    "srt_path": "C:/ruta/subtitulos.srt",
    "font_size": 8.0,
    "font_color": "#FFFFFF",
    "bold": True,
    "border_width": 2.0,
    "border_color": "#000000"
})
```

### Paso 7: Agregar keyframes (animaciones de movimiento)
```python
# Zoom progresivo
requests.post(f"{API}/add_video_keyframe", json={
    "draft_id": draft_id,
    "track_name": "main",
    "property_type": "uniform_scale",
    "time": 0.0,
    "value": "1.0"
})
requests.post(f"{API}/add_video_keyframe", json={
    "draft_id": draft_id,
    "track_name": "main",
    "property_type": "uniform_scale",
    "time": 5.0,
    "value": "1.3"
})
```

Propiedades keyframe: `position_x`, `position_y`, `rotation`, `scale_x`, `scale_y`, `uniform_scale`, `alpha`, `saturation`, `contrast`, `brightness`, `volume`

### Paso 8: Guardar draft y copiar a CapCut
```python
import shutil

# Guardar
requests.post(f"{API}/save_draft", json={"draft_id": draft_id})

# Copiar a carpeta de CapCut
src = f"C:/Carlos/tools/VectCutAPI/{draft_id}"
dst = f"C:/Users/carlo/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/{draft_id}"
shutil.copytree(src, dst, dirs_exist_ok=True)
```

### Paso 9: Exportar a MP4 (automatico)
```python
import pyautogui, time, os, glob
from pywinauto import Application

# 1. Abrir CapCut y cargar el draft (debe estar en la carpeta de drafts)
# 2. Foco en CapCut
try:
    app = Application(backend="uia").connect(title_re=".*CapCut.*", timeout=15)
    win = app.window(title_re=".*CapCut.*")
    win.set_focus()
except:
    windows = pyautogui.getWindowsWithTitle("CapCut")
    if windows:
        windows[0].activate()

time.sleep(2)

# 3. Ctrl+E abre Export
pyautogui.hotkey('ctrl', 'e')
time.sleep(3)

# 4. Enter confirma export
pyautogui.press('enter')

# 5. Esperar a que termine (polling)
timeout = 300  # 5 min max
start = time.time()
while time.time() - start < timeout:
    # Buscar MP4 mas reciente
    exports = glob.glob("C:/Users/carlo/Videos/**/*.mp4", recursive=True)
    if exports:
        newest = max(exports, key=os.path.getmtime)
        if os.path.getmtime(newest) > start:
            size1 = os.path.getsize(newest)
            time.sleep(5)
            size2 = os.path.getsize(newest)
            if size1 == size2 and size1 > 0:
                print(f"VIDEO LISTO: {newest}")
                break
    time.sleep(5)
```

## EJEMPLO COMPLETO: Video Sypnose

```python
import requests, shutil, os

API = "http://localhost:9002"

# 1. Draft horizontal HD
draft = requests.post(f"{API}/create_draft", json={"width": 1920, "height": 1080}).json()
did = draft["output"]["draft_id"]

# 2. Slide intro (imagen con logo)
requests.post(f"{API}/add_image", json={
    "draft_id": did, "image_url": "C:/Users/carlo/Videos/scene1.png",
    "start": 0, "end": 5, "width": 1920, "height": 1080,
    "intro_animation": "Fade_In"
})

# 3. Video clip principal
requests.post(f"{API}/add_video", json={
    "draft_id": did, "video_url": "C:/Users/carlo/Videos/sypnose-raw.mp4",
    "start": 0, "end": 30, "target_start": 5,
    "width": 1920, "height": 1080,
    "transition": "fade_in", "transition_duration": 1.0
})

# 4. Musica de fondo
requests.post(f"{API}/add_audio", json={
    "draft_id": did, "audio_url": "C:/ruta/musica.mp3",
    "volume": 0.2
})

# 5. Textos animados
requests.post(f"{API}/add_text", json={
    "draft_id": did, "text": "SYPNOSE",
    "start": 0, "end": 5, "font_size": 72, "font_color": "#da7756",
    "text_intro": "zoom_in", "text_outro": "fade_out"
})

requests.post(f"{API}/add_text", json={
    "draft_id": did, "text": "42 AI Models . 29 Agents . 1 Methodology",
    "start": 15, "end": 25, "font_size": 32, "font_color": "#da7756",
    "background_color": "#141413", "background_alpha": 0.8,
    "text_intro": "fade_in", "text_outro": "fade_out"
})

# 6. Guardar y copiar a CapCut
requests.post(f"{API}/save_draft", json={"draft_id": did})
src = f"C:/Carlos/tools/VectCutAPI/{did}"
dst = f"C:/Users/carlo/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/{did}"
shutil.copytree(src, dst, dirs_exist_ok=True)

# 7. Abrir CapCut → el draft aparece → Ctrl+E → Export → MP4 listo
print(f"Draft copiado a CapCut. Abre CapCut, selecciona el draft, Ctrl+E para exportar.")
```

## NOTAS
- VectCutAPI puerto por defecto: 9001 (si MinIO ocupa 9001, usar 9002)
- CapCut Desktop debe estar abierto para exportar
- El draft debe estar seleccionado/abierto en CapCut antes de Ctrl+E
- LinkedIn video: 1920x1080, max 10 min
- TikTok/Reels: 1080x1920, max 60s
- LinkedIn banner 1536x384 (NO 1584x396 — bug LinkedIn)
