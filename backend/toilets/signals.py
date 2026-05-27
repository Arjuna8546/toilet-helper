import threading
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Toilet, ToiletStatus



@receiver(post_save, sender=Toilet)
def trigger_agent_on_publish(sender, instance: Toilet, created: bool, **kwargs):

    # ── Guard 1: only act when status is PUBLISHED ────────────────────────────
    if instance.status != ToiletStatus.PUBLISHED:
        return

    # ── Capture the pk NOW — never pass the ORM instance into a thread ────────
    # Django ORM objects are not thread-safe. The instance could be garbage
    # collected or its DB connection closed by the time the thread runs.
    # A plain string pk is safe to pass across thread boundaries.
    toilet_id = str(instance.pk)

    # ── Define what the thread will actually do ───────────────────────────────
    def run_agent():
        from toilet_agents.runner import invoke_toilet_agent   # local import
        invoke_toilet_agent(toilet_id)

    # ── Spawn the thread ──────────────────────────────────────────────────────
    thread = threading.Thread(
        target=run_agent,
        daemon=True,                          # dies if the main process exits
        name=f"agent-{toilet_id}",            # visible in thread dumps / logs
    )
    thread.start()
