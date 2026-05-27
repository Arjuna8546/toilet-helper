from typing import TypedDict, Optional, Literal

class ToiletState(TypedDict):
    # Input
    toilet_id: int
    review_text: str
    photo_urls: list[str]

    # Content agent output
    caption: Optional[str]
    reel_script: Optional[str]
    audio_script: Optional[str]
    hashtags: Optional[list[str]]

    # Video agent output
    video_url: Optional[str]          # Cloudinary URL

    # Approval
    approval_status: Optional[Literal["pending", "approved", "rejected"]]
    rejection_reason: Optional[str]

    # Posting agent output
    instagram_post_id: Optional[str]
    facebook_post_id: Optional[str]