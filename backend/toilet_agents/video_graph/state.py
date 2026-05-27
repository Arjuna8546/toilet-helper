from typing import TypedDict, Optional

class VideoState(TypedDict):
    # Inputs from parent graph
    toilet_id:    int
    photo_urls:   list[str]
    audio_script: str
    caption:      str

    # Internal intermediate state
    image_paths:  Optional[list[str]]   # local temp paths after download
    audio_path:   Optional[str]         # local temp .mp3 path
    raw_video_path: Optional[str]       # local .mp4 before upload

    # Output back to parent graph
    video_url:    Optional[str]