# /capcut-video — Create Videos with CapCut from Claude Code

A skill that lets any Claude Code agent create complete videos in CapCut Desktop — from scratch to exported MP4.

## How It Works

```
You (Claude Code)          VectCutAPI (:9002)          CapCut Desktop
      |                         |                          |
      |--- create_draft ------->|                          |
      |--- add_video ---------->|                          |
      |--- add_image ---------->|                          |
      |--- add_audio ---------->|                          |
      |--- add_text ----------->|                          |
      |--- add_effect --------->|                          |
      |--- save_draft --------->|                          |
      |                         |--- writes draft -------->|
      |--- Ctrl+E (pyautogui) --------------------------->|
      |                         |                          |--- renders MP4
      |<---------------------------------------- final.mp4 |
```

## Quick Start

1. Copy `SKILL.md` to your project's `.claude/commands/capcut-video.md`
2. Make sure CapCut Desktop is installed and open
3. Run `/capcut-video` in Claude Code

That's it. The skill auto-installs VectCutAPI on first run.

## What You Can Do

| Feature | How |
|---------|-----|
| Add video clips | `add_video` — trim, position, transitions, speed, volume |
| Add images as slides | `add_image` — duration, intro/outro animations |
| Add background music | `add_audio` — volume, speed, track name |
| Add animated text | `add_text` — font, color, shadow, background, intro/outro animations |
| Add subtitles | `add_subtitle` — SRT file, font, color, border |
| Add effects | `add_effect` — visual effects and filters |
| Add stickers | `add_sticker` — position, scale, rotation |
| Keyframe animations | `add_video_keyframe` — position, scale, rotation, alpha over time |
| Export to MP4 | `Ctrl+E` via pyautogui — automatic export |

## Example: Create a 30-Second Product Video

Tell Claude Code:

> "Create a 30-second video about my product. Use these images as slides with fade transitions, add this MP3 as background music, and overlay the product name as animated text."

Claude will:
1. Run Paso 0 (auto-install VectCutAPI if needed)
2. Create a 1920x1080 draft
3. Add your images with `Fade_In` animations
4. Add your MP3 at 30% volume
5. Add text overlays with `zoom_in` entrance animation
6. Save the draft to CapCut's project folder
7. Open CapCut, press `Ctrl+E` to export
8. Tell you where the MP4 is

## Available Animations

**Image intro**: `Fade_In`, `Zoom_In`, `Zoom_Out`, `Slide_Right`, `Slide_Left`, `Slide_Up`, `Slide_Down`, `Rotate`, `Flip`, `Screen_Wipe`, `Puzzle`, `Blinds`, `Swing`

**Text intro/outro**: `fade_in`, `fade_out`, `zoom_in`, `zoom_out`, `slide_left`, `slide_right`

**Video transitions**: `fade_in`, `wipe_left`, `wipe_right`, `wipe_up`, `wipe_down`

**Keyframe properties**: `position_x`, `position_y`, `rotation`, `scale_x`, `scale_y`, `uniform_scale`, `alpha`, `brightness`, `contrast`, `saturation`, `volume`

## Resolutions

| Format | Size | Use |
|--------|------|-----|
| Horizontal HD | 1920x1080 | YouTube, LinkedIn, presentations |
| Vertical | 1080x1920 | TikTok, Reels, Shorts |
| Square | 1080x1080 | Instagram, Facebook |

## Requirements

- CapCut Desktop (installed and open)
- Python 3.10+
- Git
- Windows or macOS

VectCutAPI is auto-installed on first run. No manual setup needed.

## Author

Carlos De La Torre — [Sypnose](https://github.com/radelqui/sypnose)
