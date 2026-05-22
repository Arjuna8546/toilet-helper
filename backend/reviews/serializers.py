from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    toilet_name = serializers.CharField(source='toilet.name', read_only=True)
    water_availability_display = serializers.CharField(
        source='get_water_availability_display', read_only=True
    )

    class Meta:
        model = Review
        fields = [
            'id', 'toilet', 'toilet_name',
            'cleanliness', 'smell', 'privacy', 'lighting',
            'maintenance', 'safety', 'overall',
            'water_availability', 'water_availability_display',
            'has_soap', 'has_mirror', 'has_dustbin',
            'has_hand_dryer', 'has_sanitary_vending',
            'crowd_level', 'best_time_to_visit',
            'visited_at', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ReviewCreateSerializer(ReviewSerializer):
    """Admin-only serializer — includes admin_note."""

    class Meta(ReviewSerializer.Meta):
        fields = ReviewSerializer.Meta.fields + ['admin_note']