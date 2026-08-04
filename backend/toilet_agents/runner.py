import os
import logging
import traceback
from pathlib import Path
from dotenv import load_dotenv

# ── Load .env ─────────────────────────────────────────────────────────────────
# toilet_agents/ sits inside backend/, so .env is one level up from this file.
# Path: backend/toilet_agents/runner.py  →  backend/.env
env_path = Path(__file__).resolve().parent.parent / ".env"
loaded   = load_dotenv(env_path)

logger = logging.getLogger(__name__)

# ── Verify .env loaded correctly (runs once at import time) ───────────────────
logger.info("[runner] .env path   : %s", env_path)
logger.info("[runner] .env exists : %s", env_path.exists())
logger.info("[runner] .env loaded : %s", loaded)
logger.info(
    "[runner] GOOGLE_API_KEY        : %s",
    "SET ✓" if os.environ.get("GOOGLE_API_KEY") else "MISSING ❌",
)
logger.info(
    "[runner] CLOUDINARY_CLOUD_NAME : %s",
    "SET ✓" if os.environ.get("CLOUDINARY_CLOUD_NAME") else "MISSING ❌",
)
logger.info(
    "[runner] CLOUDINARY_API_KEY    : %s",
    "SET ✓" if os.environ.get("CLOUDINARY_API_KEY") else "MISSING ❌",
)
logger.info(
    "[runner] CLOUDINARY_API_SECRET : %s",
    "SET ✓" if os.environ.get("CLOUDINARY_API_SECRET") else "MISSING ❌",
)
logger.info(
    "[runner] LANGCHAIN_TRACING_V2  : %s",
    "SET ✓" if os.environ.get("LANGCHAIN_TRACING_V2") else "MISSING ❌",
)
logger.info(
    "[runner] LANGCHAIN_API_KEY     : %s",
    "SET ✓" if os.environ.get("LANGCHAIN_API_KEY") else "MISSING ❌",
)


# ── Build review text from toilet model ───────────────────────────────────────

def _build_review_text(toilet) -> str:
    """
    Uses ToiletSerializer to get a clean dict, then builds a
    natural-language description for the content agent prompt.
    """
    from toilets.serializers import ToiletSerializer  # local import — Django must be ready

    data = ToiletSerializer(toilet).data

    features = []
    if data["is_wheelchair_accessible"]: features.append("wheelchair accessible")
    if data["is_women_friendly"]:        features.append("women friendly")
    if data["has_western_toilet"]:       features.append("western-style toilet")
    if data["has_indian_toilet"]:        features.append("Indian-style toilet")
    if data["has_baby_changing"]:        features.append("baby changing station")
    if data["has_parking"]:              features.append("parking available")

    price_info   = "free to use" if data["is_free"] else f"entry fee ₹{data['price_inr']}"
    hours        = data["operating_hours"] or "24/7"
    feature_str  = ", ".join(features) if features else "basic amenities"
    avg_clean    = data.get("avg_cleanliness")
    rating_str   = f"Average cleanliness rating: {avg_clean}/5." if avg_clean else ""
    review_count = data.get("review_count", 0)

    return (
        f"{data['name']} is a {data['category_display']} located in "
        f"{data['city']}, {data['district']}. "
        f"It is {price_info}, open {hours}. "
        f"Features: {feature_str}. "
        f"Address: {data['address']}. "
        f"{rating_str} "
        f"Verified by {review_count} reviewer(s)."
    ).strip()


# ── Main agent entry point ────────────────────────────────────────────────────

def invoke_toilet_agent(toilet_id: str) -> None:
    """
    Called by the Celery worker after a toilet is published.
    Fetches the toilet, builds state, runs the LangGraph pipeline,
    and logs the result.
    """
    # local imports — deferred so Django is fully ready when these run
    from toilets.models import Toilet
    from toilet_agents.main_graph import graph

    logger.info("[runner] ── Starting agent for toilet_id=%s ──", toilet_id)

    # ── Step 1: Fetch toilet from DB ──────────────────────────────────────────
    try:
        toilet = Toilet.objects.prefetch_related("photos", "reviews").get(pk=toilet_id)
        logger.info("[runner] Toilet fetched: '%s' (status=%s)", toilet.name, toilet.status)
    except Toilet.DoesNotExist:
        logger.error(
            "[runner] Toilet %s not found in DB — it may have been deleted.", toilet_id
        )
        return
    except Exception:
        logger.error(
            "[runner] Unexpected error fetching toilet %s\n%s",
            toilet_id,
            traceback.format_exc(),
        )
        return

    # ── Step 2: Collect photo URLs ────────────────────────────────────────────
    photo_urls = list(toilet.photos.values_list("image_url", flat=True))
    if not photo_urls:
        logger.warning(
            "[runner] Skipping toilet %s ('%s') — no photos uploaded yet.",
            toilet_id,
            toilet.name,
        )
        return
    logger.info("[runner] Found %d photo(s): %s", len(photo_urls), photo_urls)

    # ── Step 3: Build review text from serializer ─────────────────────────────
    try:
        review_text = _build_review_text(toilet)
        logger.info("[runner] review_text built:\n  %s", review_text)
    except Exception:
        logger.error(
            "[runner] Failed to build review_text for toilet %s\n%s",
            toilet_id,
            traceback.format_exc(),
        )
        return

    # ── Step 4: Assemble initial LangGraph state ──────────────────────────────
    initial_state = {
        "toilet_id":           str(toilet.id),
        "review_text":         review_text,
        "photo_urls":          photo_urls,
        # agent outputs — all start as None
        "caption":             None,
        "reel_script":         None,
        "audio_script":        None,
        "hashtags":            None,
        "video_url":           None,
        "approval_status":     None,
        "rejection_reason":    None,
        "instagram_post_id":   None,
        "facebook_post_id":    None,
    }
    logger.info("[runner] Initial state assembled for toilet %s", toilet_id)

    # ── Step 5: Run the graph ─────────────────────────────────────────────────
    try:
        logger.info("[runner] Invoking LangGraph — content → video_subgraph ...")
        result = graph.invoke(
            initial_state,
            config={"configurable": {"thread_id": str(toilet_id)}}
        )
        logger.info(
            "[runner] Graph completed ✓\n"
            "  caption            : %s\n"
            "  audio_script (preview) : %s\n"
            "  hashtags           : %s\n"
            "  video_url          : %s",
            result.get("caption"),
            (result.get("audio_script") or "")[:80],
            result.get("hashtags"),
            result.get("video_url"),
        )

        video_url = result.get("video_url")
        if video_url:
            # A generated reel belongs to the toilet, not to one source photo.
            Toilet.objects.filter(pk=toilet_id).update(generated_video_url=video_url)
            logger.info("[runner] Saved generated video URL for toilet_id=%s", toilet_id)
        else:
            logger.warning("[runner] Graph completed without a video URL for toilet_id=%s", toilet_id)
    except Exception:
        logger.error(
            "[runner] Graph invocation failed for toilet %s\n"
            "Error     : %s\n"
            "Traceback :\n%s",
            toilet_id,
            traceback.format_exc().strip().splitlines()[-1],
            traceback.format_exc(),
        )
        return

    logger.info("[runner] ── Agent finished for toilet_id=%s ──", toilet_id)
