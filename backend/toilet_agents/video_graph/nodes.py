import os
import asyncio
import tempfile
import requests
import numpy as np
from pathlib import Path
from PIL import Image

import edge_tts
import cloudinary
import cloudinary.uploader
from moviepy import (
    ImageClip, AudioFileClip, CompositeVideoClip,
    concatenate_videoclips, TextClip, ColorClip, vfx,
)

from toilet_agents.video_graph.state import VideoState
from toilet_agents.video_graph.constants import (
    REEL_W, REEL_H, REEL_FPS, PHOTO_DUR, TRANSITION_DUR,
    ZOOM_START, ZOOM_END, CAPTION_FONT_SZ, CAPTION_COLOR,
    BAR_COLOR, BAR_OPACITY, BAR_HEIGHT, TTS_VOICE,
)

cloudinary.config(
    cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
    api_key=os.environ["CLOUDINARY_API_KEY"],
    api_secret=os.environ["CLOUDINARY_API_SECRET"],
)

# ── Shared temp dir (created once, reused across nodes) ──────────────────────
_TMP_DIR: dict[int, str] = {}   # keyed by toilet_id


def _get_tmp(toilet_id: int) -> Path:
    if toilet_id not in _TMP_DIR:
        _TMP_DIR[toilet_id] = tempfile.mkdtemp(prefix=f"reel_{toilet_id}_")
    return Path(_TMP_DIR[toilet_id])





# ── Node 1: Download photos ───────────────────────────────────────────────────

def download_photos_node(state: VideoState) -> VideoState:
    tmp         = _get_tmp(state["toilet_id"])
    image_paths = []

    for i, url in enumerate(state["photo_urls"]):
        dest = str(tmp / f"photo_{i}.jpg")
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        with open(dest, "wb") as f:
            f.write(resp.content)
        image_paths.append(dest)

    if not image_paths:
        raise ValueError("No photo URLs provided.")

    return {**state, "image_paths": image_paths}


# ── Node 2: Generate TTS audio ────────────────────────────────────────────────

def generate_audio_node(state: VideoState) -> VideoState:
    tmp        = _get_tmp(state["toilet_id"])
    audio_path = str(tmp / "voiceover.mp3")

    async def _tts():
        communicate = edge_tts.Communicate(state["audio_script"], TTS_VOICE)
        await communicate.save(audio_path)

    asyncio.run(_tts())

    return {**state, "audio_path": audio_path}


# ── Node 3: Build video ───────────────────────────────────────────────────────

def _crop_to_916(img: Image.Image) -> Image.Image:
    w, h   = img.size
    target = REEL_W / REEL_H
    actual = w / h
    if actual > target:
        new_w = int(h * target)
        left  = (w - new_w) // 2
        img   = img.crop((left, 0, left + new_w, h))
    else:
        new_h = int(w / target)
        top   = (h - new_h) // 2
        img   = img.crop((0, top, w, top + new_h))
    return img.resize((REEL_W, REEL_H), Image.LANCZOS)


def _ken_burns(clip: ImageClip) -> ImageClip:
    """Ken Burns zoom effect — uses MoviePy v2's .transform() instead of .fl()."""
    def zoomed_frame(get_frame, t):
        progress = t / clip.duration
        zoom     = ZOOM_START + (ZOOM_END - ZOOM_START) * progress
        frame    = get_frame(t)
        fh, fw   = frame.shape[:2]
        crop_w   = int(fw / zoom)
        crop_h   = int(fh / zoom)
        x1       = (fw - crop_w) // 2
        y1       = (fh - crop_h) // 2
        cropped  = frame[y1:y1 + crop_h, x1:x1 + crop_w]
        return np.array(Image.fromarray(cropped).resize((fw, fh), Image.LANCZOS))

    return clip.transform(zoomed_frame)


def _caption_overlay(caption: str, duration: float) -> list:
    bar = (
        ColorClip(size=(REEL_W, BAR_HEIGHT), color=BAR_COLOR)
        .with_opacity(BAR_OPACITY)
        .with_position(("center", REEL_H - BAR_HEIGHT))
        .with_duration(duration)
    )

    # v2: font must be a file path (not a name string); both font= and text=
    # must be passed as keyword args because font is the first positional param.
    txt = (
        TextClip(
            font=None,                          # Pillow built-in default
            text=caption,                       # keyword to avoid "multiple values" error
            font_size=CAPTION_FONT_SZ,
            color=CAPTION_COLOR,
            method="caption",                   # wraps text to fit given width
            size=(REEL_W - 80, BAR_HEIGHT - 40),# v2: both dims must be ints for caption
            text_align="center",
            horizontal_align="center",
            vertical_align="center",
        )
        .with_position(("center", REEL_H - BAR_HEIGHT))
        .with_duration(duration)
    )
    return [bar, txt]


def build_video_node(state: VideoState) -> VideoState:
    tmp         = _get_tmp(state["toilet_id"])
    audio_clip  = AudioFileClip(state["audio_path"])
    n_photos    = len(state["image_paths"])
    photo_dur   = max(PHOTO_DUR, audio_clip.duration / n_photos)

    # Build Ken Burns clips
    clips = []
    for path in state["image_paths"]:
        img  = _crop_to_916(Image.open(path).convert("RGB"))
        clip = ImageClip(np.array(img), duration=photo_dur)
        clip = _ken_burns(clip)
        clips.append(clip)

    # Crossfade — v2: crossfadein() → with_effects([vfx.CrossFadeIn(d)])
    faded = [clips[0]]
    for clip in clips[1:]:
        faded.append(clip.with_effects([vfx.CrossFadeIn(TRANSITION_DUR)]))

    video_clip = concatenate_videoclips(faded, method="compose", padding=-TRANSITION_DUR)

    # Match audio duration
    if video_clip.duration < audio_clip.duration:
        video_clip = video_clip.with_duration(audio_clip.duration)
    else:
        video_clip = video_clip.subclipped(0, audio_clip.duration)

    # Attach audio + captions
    video_clip = video_clip.with_audio(audio_clip)
    overlays   = _caption_overlay(state["caption"], video_clip.duration)
    final_clip = CompositeVideoClip([video_clip] + overlays, size=(REEL_W, REEL_H))

    output_path = str(tmp / f"reel_{state['toilet_id']}.mp4")
    final_clip.write_videofile(
        output_path,
        fps=REEL_FPS,
        codec="libx264",
        audio_codec="aac",
        temp_audiofile=str(tmp / "temp_audio.m4a"),
        remove_temp=True,
        logger=None,
    )

    return {**state, "raw_video_path": output_path}


# ── Node 4: Upload to Cloudinary ──────────────────────────────────────────────

def upload_node(state: VideoState) -> VideoState:
    result = cloudinary.uploader.upload(
        state["raw_video_path"],
        resource_type="video",
        folder="toilettrail/reels",
        public_id=f"toilet_{state['toilet_id']}_reel",
        overwrite=True,
        transformation=[
            {"width": REEL_W, "height": REEL_H, "crop": "fill"},
            {"quality": "auto"},
        ],
    )

    import shutil
    shutil.rmtree(_TMP_DIR.pop(state["toilet_id"], ""), ignore_errors=True)

    return {**state, "video_url": result["secure_url"]}