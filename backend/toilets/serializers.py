from rest_framework import serializers
from .models import Toilet, ToiletPhoto, VerificationVote
from reviews.models import Review


class ToiletPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToiletPhoto
        fields = [
            'id', 'cloudinary_public_id', 'image_url',
            'caption', 'is_cover', 'uploaded_at',
        ]
        read_only_fields = ['id', 'uploaded_at']


class ToiletSerializer(serializers.ModelSerializer):
    photos = ToiletPhotoSerializer(many=True, read_only=True)
    cover_photo_url = serializers.SerializerMethodField()
    avg_cleanliness = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Toilet
        fields = [
            'id', 'name', 'category', 'category_display', 'status',
            'latitude', 'longitude', 'address', 'city', 'district',
            'landmark', 'google_maps_url', 'osm_node_id',
            'is_free', 'price_inr', 'operating_hours', 'phone_number',
            'is_wheelchair_accessible', 'is_women_friendly',
            'has_western_toilet', 'has_indian_toilet',
            'has_baby_changing', 'has_parking',
            'verification_count', 'photos', 'cover_photo_url',
            'avg_cleanliness', 'review_count',
            'created_at', 'updated_at', 'published_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'verification_count']

    def get_cover_photo_url(self, obj):
        cover = obj.photos.filter(is_cover=True).first() or obj.photos.first()
        return cover.image_url if cover else None

    def get_avg_cleanliness(self, obj):
        reviews = obj.reviews.all()
        if not reviews:
            return None
        return round(sum(r.cleanliness for r in reviews) / len(reviews), 1)

    def get_review_count(self, obj):
        return obj.reviews.count()


class ToiletCreateSerializer(serializers.ModelSerializer):
    """Used by admin for create/update — includes status field."""
    class Meta:
        model = Toilet
        fields = [
            'id','name', 'category', 'status',
            'latitude', 'longitude', 'address', 'city', 'district',
            'landmark', 'google_maps_url', 'osm_node_id',
            'is_free', 'price_inr', 'operating_hours', 'phone_number',
            'is_wheelchair_accessible', 'is_women_friendly',
            'has_western_toilet', 'has_indian_toilet',
            'has_baby_changing', 'has_parking',
            'published_at',
        ]


class ToiletDetailSerializer(ToiletSerializer):
    """Full detail including nested reviews — used for single toilet endpoint."""
    reviews = serializers.SerializerMethodField()

    class Meta(ToiletSerializer.Meta):
        fields = ToiletSerializer.Meta.fields + ['reviews']

    def get_reviews(self, obj):
        from reviews.serializers import ReviewSerializer
        qs = obj.reviews.all().order_by('-visited_at')
        return ReviewSerializer(qs, many=True).data


class VerificationVoteSerializer(serializers.ModelSerializer):
    voter_username = serializers.CharField(source='voter.username', read_only=True)

    class Meta:
        model = VerificationVote
        fields = ['id', 'toilet', 'voter_username', 'is_positive', 'weight', 'voted_at']
        read_only_fields = ['id', 'voter_username', 'weight', 'voted_at']


class VoteCountSerializer(serializers.Serializer):
    toilet = serializers.UUIDField()
    positive = serializers.IntegerField()
    negative = serializers.IntegerField()
    total = serializers.IntegerField()