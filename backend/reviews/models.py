from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class WaterAvailability(models.TextChoices):
    AVAILABLE   = 'AVAILABLE',   'Available'
    SOMETIMES   = 'SOMETIMES',   'Sometimes Available'
    UNAVAILABLE = 'UNAVAILABLE', 'Not Available'


class Review(models.Model):
    """
    Fully structured review — every field is machine-readable (numbers / choices,
    never free text). This is what makes the AI pipeline produce consistent output.
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    toilet      = models.ForeignKey('toilets.Toilet', on_delete=models.CASCADE, related_name='reviews')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    # ── Ratings (1–5) ────────────────────────────────────────────────────────
    cleanliness = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    smell       = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    privacy     = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    lighting    = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    maintenance = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    safety      = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    overall     = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])

    # ── Facilities ───────────────────────────────────────────────────────────
    water_availability    = models.CharField(
        max_length=15, choices=WaterAvailability.choices,
        default=WaterAvailability.AVAILABLE
    )
    has_soap              = models.BooleanField(default=False)
    has_mirror            = models.BooleanField(default=False)
    has_dustbin           = models.BooleanField(default=False)
    has_hand_dryer        = models.BooleanField(default=False)
    has_sanitary_vending  = models.BooleanField(default=False)

    # ── Crowd & timing ───────────────────────────────────────────────────────
    crowd_level        = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1 = Empty, 5 = Always crowded"
    )
    best_time_to_visit = models.CharField(max_length=50, blank=True)

    # ── Admin only ────────────────────────────────────────────────────────────
    # Not shown publicly; not fed to the AI pipeline
    admin_note = models.TextField(blank=True)

    visited_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-visited_at']

    def __str__(self):
        return f"Review of {self.toilet.name} — {self.overall}/5 overall"

    def to_ai_json(self) -> dict:
        """Returns clean, structured JSON for the content agent."""
        return {
            "toilet_name": self.toilet.name,
            "location":    f"{self.toilet.city}, Kerala",
            "category":    self.toilet.get_category_display(),
            "ratings": {
                "cleanliness": self.cleanliness,
                "smell":       self.smell,
                "privacy":     self.privacy,
                "lighting":    self.lighting,
                "maintenance": self.maintenance,
                "safety":      self.safety,
                "overall":     self.overall,
            },
            "facilities": {
                "water":            self.get_water_availability_display(),
                "soap":             self.has_soap,
                "mirror":           self.has_mirror,
                "dustbin":          self.has_dustbin,
                "sanitary_vending": self.has_sanitary_vending,
            },
            "access": {
                "free":         self.toilet.is_free,
                "price_inr":    self.toilet.price_inr,
                "wheelchair":   self.toilet.is_wheelchair_accessible,
                "women_friendly": self.toilet.is_women_friendly,
                "parking":      self.toilet.has_parking,
            },
            "crowd_level": self.crowd_level,
        }