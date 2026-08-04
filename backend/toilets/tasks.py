import logging

from celery import shared_task

from toilet_agents.runner import invoke_toilet_agent


logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    acks_late=True,
    track_started=True,
    soft_time_limit=25 * 60,
    time_limit=30 * 60,
)
def generate_toilet_reel(self, toilet_id: str) -> None:
    """Generate and persist the AI reel for one published toilet."""
    logger.info("[task] Starting reel generation for toilet_id=%s", toilet_id)
    invoke_toilet_agent(toilet_id)
