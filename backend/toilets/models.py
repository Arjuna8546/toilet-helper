from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class ToiletStatus(models.TextChoices):
    DRAFT        = 'DRAFT',        'Draft'
    PENDING      = 'PENDING',      'Pending Review'
    UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
    VERIFIED     = 'VERIFIED',     'Verified'
    PUBLISHED    = 'PUBLISHED',    'Published'
    REJECTED     = 'REJECTED',     'Rejected'


class ToiletCategory(models.TextChoices):
    PUBLIC  = 'PUBLIC',   'Public Toilet'
    PRIVATE = 'PRIVATE',  'Private / Paid'
    HOTEL   = 'HOTEL',    'Hotel / Restaurant'
    HIGHWAY = 'HIGHWAY',  'Highway Rest Stop'
    PETROL  = 'PETROL',   'Petrol Station'
    MALL    = 'MALL',     'Shopping Mall'
    RAILWAY = 'RAILWAY',  'Railway Station'
    BEACH   = 'BEACH',    'Beach / Park'


class Toilet(models.Model):
    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name     = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=ToiletCategory.choices)
    status   = models.CharField(
        max_length=20, choices=ToiletStatus.choices,
        default=ToiletStatus.DRAFT, db_index=True
    )

    # Location
    latitude  = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    address   = models.TextField()
    city      = models.CharField(max_length=100, default='')
    district  = models.CharField(max_length=100, default='')
    landmark  = models.CharField(max_length=200, blank=True)

    # External references
    google_maps_url = models.URLField(blank=True)
    osm_node_id     = models.CharField(max_length=50, blank=True)

    # Basic info
    is_free         = models.BooleanField(default=True)
    price_inr       = models.PositiveSmallIntegerField(null=True, blank=True)
    operating_hours = models.CharField(max_length=100, blank=True, default='24/7')
    phone_number    = models.CharField(max_length=20, blank=True)

    # Access features
    is_wheelchair_accessible = models.BooleanField(default=False)
    is_women_friendly        = models.BooleanField(default=False)
    has_western_toilet       = models.BooleanField(default=False)
    has_indian_toilet        = models.BooleanField(default=False)
    has_baby_changing        = models.BooleanField(default=False)
    has_parking              = models.BooleanField(default=False)

    # Verification
    verification_count = models.PositiveSmallIntegerField(default=0)
    submitted_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='submitted_toilets'
    )
    verified_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='verified_toilets'
    )

    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)
    generated_video_url = models.URLField(max_length=1000, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'city']),
            models.Index(fields=['latitude', 'longitude']),
        ]

    def __str__(self):
        return f"{self.name} ({self.city})"

    def average_rating(self):
        reviews = self.reviews.all()
        if not reviews:
            return None
        return round(sum(r.overall for r in reviews) / len(reviews), 1)


class ToiletPhoto(models.Model):
    toilet      = models.ForeignKey(Toilet, on_delete=models.CASCADE, related_name='photos')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    cloudinary_public_id = models.CharField(max_length=500)   # Used for deletion
    image_url            = models.URLField(max_length=1000)    # Cloudinary secure_url
    caption              = models.CharField(max_length=200, blank=True)
    is_cover             = models.BooleanField(default=False)
    uploaded_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_cover', '-uploaded_at']

    def __str__(self):
        return f"Photo for {self.toilet.name} ({'cover' if self.is_cover else 'gallery'})"


class VerificationVote(models.Model):
    toilet    = models.ForeignKey(Toilet, on_delete=models.CASCADE, related_name='votes')
    voter     = models.ForeignKey(User, on_delete=models.CASCADE)
    weight    = models.FloatField(default=1.0)   # Trust score multiplier — future use
    is_positive = models.BooleanField(default=True)
    voted_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['toilet', 'voter']

    def __str__(self):
        sign = '✓' if self.is_positive else '✗'
        return f"{sign} {self.voter.username} → {self.toilet.name}"
