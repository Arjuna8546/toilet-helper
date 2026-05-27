from toilet_agents.state import ToiletState
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from typing import List
import re

model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",   # ← best for this job
    temperature=0.9,             # ← slightly higher for creative/witty output
    max_retries=2,               # ← auto-retry on transient API errors
)


class ContentSchema(BaseModel):
    """Structured social media content generated for a toilet review."""

    caption: str = Field(
        description=(
            "A punchy, friendly Instagram caption for the toilet review. "
            "Use emojis where appropriate. "
            "Tone: lighthearted, honest, helpful."
        )
    )
    reel_script: str = Field(
        description=(
            "A 30-second vertical video voiceover script (≈75–90 words). "
            "Hook in the first 3 seconds. Conversational tone. "
            "Include light stage directions in [brackets] e.g. [upbeat tone]. "
            "End with a clear call-to-action like 'Follow for more loo reviews!'"
        )
    )
    audio_script: str = Field(
        description=(
            "A clean, spoken-word-only version of the reel script. "
            "NO stage directions, NO brackets, NO emojis, NO special characters. "
            "Pure natural speech that a text-to-speech engine will read aloud. "
            "≈75–90 words, conversational, ends with the call-to-action."
        )
    )
    hashtags: List[str] = Field(
        description=(
            "Exactly 10 relevant Instagram hashtags without the '#' prefix. "
            "Mix of broad (e.g., 'travel') and niche (e.g., 'toiletreview') tags."
        ),
        min_length=10,
        max_length=10,
    )

def sanitize(result: ContentSchema) -> dict:

    # ── caption: hard truncate at 150 ─────────────────────────────────────────
    caption = result.caption.strip()
    if len(caption) > 150:
        caption = caption[:147].rstrip() + "..."

    # ── audio_script: strip everything a TTS engine chokes on ─────────────────
    audio = result.audio_script
    audio = re.sub(r"\[.*?\]", "", audio)          # remove [stage directions]
    audio = re.sub(r"#\w+", "", audio)             # remove #hashtags
    audio = audio.encode("ascii", "ignore").decode("ascii")  # remove emojis
    audio = re.sub(r"\s+", " ", audio).strip()    # collapse whitespace

    # ── hashtags: always exactly 10, no # prefix ──────────────────────────────
    hashtags = [h.lstrip("#").strip() for h in result.hashtags]
    hashtags = [h for h in hashtags if h]          # drop empty strings
    hashtags = hashtags[:10]                        # cap at 10
    while len(hashtags) < 10:                       # pad if under 10
        hashtags.append("publictoilet")

    return {
        "caption":      caption,
        "reel_script":  result.reel_script.strip(),
        "audio_script": audio,
        "hashtags":     hashtags,
    }

structured_model = model.with_structured_output(ContentSchema)



PROMPT = """
You are a witty social media manager for LooReview, the world's first
public toilet review platform.

TOILET ID  : {toilet_id}
REVIEW     : {review_text}

Generate content with these exact fields:
- caption      : Max 150 characters. Punchy, emoji-friendly.
- reel_script  : 30-second voiceover. Hook first. [tone directions] in brackets.
- audio_script : Same as reel_script but NO brackets, NO emojis, plain speech only.
- hashtags     : Exactly 10, no # prefix.
"""

def content_agent(state: ToiletState) -> ToiletState:
    prompt = PROMPT.format(
        toilet_id=state["toilet_id"],
        review_text=state["review_text"],
    )

    result: ContentSchema = structured_model.invoke(prompt)

    sanitized = sanitize(result)

    return {**state, **sanitized}