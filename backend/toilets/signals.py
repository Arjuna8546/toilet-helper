from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Toilet, ToiletStatus


@receiver(post_save, sender=Toilet)
def trigger_agent_on_publish(sender, instance: Toilet, created: bool, **kwargs):
    """Queue reel generation after a toilet is published."""
    if (
        instance.status != ToiletStatus.PUBLISHED
        or getattr(instance, "_was_published", False)
    ):
        return

    toilet_id = str(instance.pk)

    def enqueue_reel() -> None:
        from toilets.tasks import generate_toilet_reel

        generate_toilet_reel.delay(toilet_id)

    # Do not let a worker read the row until the publishing transaction commits.
    transaction.on_commit(enqueue_reel)


@receiver(pre_save, sender=Toilet)
def remember_previous_publication_state(sender, instance: Toilet, **kwargs):
    """Allow the post-save handler to enqueue only on a status transition."""
    if not instance.pk:
        instance._was_published = False
        return

    instance._was_published = sender.objects.filter(
        pk=instance.pk,
        status=ToiletStatus.PUBLISHED,
    ).exists()
