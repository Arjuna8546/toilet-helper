from math import radians, sin, cos, sqrt, atan2

import cloudinary
import cloudinary.uploader
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from .models import Toilet, ToiletPhoto, ToiletStatus, VerificationVote
from .serializers import (
    ToiletSerializer,
    ToiletCreateSerializer,
    ToiletDetailSerializer,
    VerificationVoteSerializer,
    VoteCountSerializer,
    ToiletPhotoSerializer,
    ToiletMapPopupSerializer
)


def haversine_distance(lat1, lng1, lat2, lng2):
    """Returns distance in metres between two lat/lng coordinates."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = radians(lat1), radians(float(lat2))
    dphi = radians(float(lat2) - lat1)
    dlambda = radians(float(lng2) - lng1)
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlambda / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


class ToiletViewSet(viewsets.ModelViewSet):
    """
    GET  /api/toilets/                     — list published toilets (public)
    GET  /api/toilets/{id}/                — single toilet with reviews & photos (public)
    POST /api/toilets/                     — create toilet (admin)
    PATCH/PUT /api/toilets/{id}/           — update toilet (admin)
    DELETE /api/toilets/{id}/              — soft delete → REJECTED (admin)
    GET  /api/toilets/nearby/?lat=&lng=&radius=  — geo search (public)
    """

    queryset = Toilet.objects.prefetch_related('photos', 'reviews').all()

    def get_queryset(self):
        qs = super().get_queryset()
        # Non-admins only see published toilets
        if not (self.request.user and self.request.user.is_staff):
            qs = qs.filter(status=ToiletStatus.PUBLISHED)
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ToiletDetailSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return ToiletCreateSerializer
        return ToiletSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    # ------------------------------------------------------------------ #
    #  Soft delete — sets status=REJECTED instead of removing the row     #
    # ------------------------------------------------------------------ #
    def destroy(self, request, *args, **kwargs):
        toilet = self.get_object()
        toilet.status = ToiletStatus.REJECTED
        toilet.save(update_fields=['status', 'updated_at'])
        return Response(
            {'detail': 'Toilet soft-deleted (status set to REJECTED).'},
            status=status.HTTP_200_OK,
        )

    # ------------------------------------------------------------------ #
    #  Auto-set published_at when status changes to PUBLISHED             #
    # ------------------------------------------------------------------ #
    def perform_update(self, serializer):
        instance = self.get_object()
        new_status = serializer.validated_data.get('status', instance.status)
        extra = {}
        if new_status == ToiletStatus.PUBLISHED and instance.status != ToiletStatus.PUBLISHED:
            extra['published_at'] = timezone.now()
        serializer.save(**extra)

    def perform_create(self, serializer):
        extra = {}
        if serializer.validated_data.get('status') == ToiletStatus.PUBLISHED:
            extra['published_at'] = timezone.now()
        serializer.save(submitted_by=self.request.user if self.request.user.is_authenticated else None, **extra)

    # ------------------------------------------------------------------ #
    #  GET /api/toilets/nearby/?lat=9.93&lng=76.27&radius=5000            #
    # ------------------------------------------------------------------ #
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def nearby(self, request):
        try:
            lat = float(request.query_params['lat'])
            lng = float(request.query_params['lng'])
        except (KeyError, ValueError):
            return Response(
                {'detail': 'lat and lng query parameters are required and must be numbers.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        radius = float(request.query_params.get('radius', 5000))

        toilets = self.get_queryset()
        results = []
        for toilet in toilets:
            dist = haversine_distance(lat, lng, toilet.latitude, toilet.longitude)
            if dist <= radius:
                results.append({
                    **ToiletSerializer(toilet, context={'request': request}).data,
                    'distance_metres': round(dist),
                })

        results.sort(key=lambda x: x['distance_metres'])
        return Response(results)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def in_bounds(self, request):
        """
        GET /api/toilets/in_bounds/?north=&south=&east=&west=
        Returns all published toilets within the map viewport bounding box.
        Optionally also returns distance from a user point if lat/lng provided.
        """
        try:
            north = float(request.query_params['north'])
            south = float(request.query_params['south'])
            east  = float(request.query_params['east'])
            west  = float(request.query_params['west'])
        except (KeyError, ValueError):
            return Response(
                {'detail': 'north, south, east, west are required numeric query params.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
 
        # Optional user location for distance calculation
        user_lat = request.query_params.get('lat')
        user_lng = request.query_params.get('lng')
 
        toilets = self.get_queryset().filter(
            latitude__gte=south,
            latitude__lte=north,
            longitude__gte=west,
            longitude__lte=east,
        )
 
        results = []
        for toilet in toilets:
            data = ToiletMapPopupSerializer(toilet, context={'request': request}).data
            if user_lat and user_lng:
                dist = haversine_distance(float(user_lat), float(user_lng),
                                         toilet.latitude, toilet.longitude)
                data['distance_metres'] = round(dist)
            results.append(data)
 
        if user_lat and user_lng:
            results.sort(key=lambda x: x.get('distance_metres', 0))
 
        return Response(results)


# ------------------------------------------------------------------ #
#  Photo Upload — POST /api/toilets/{id}/photos/                      #
# ------------------------------------------------------------------ #
class PhotoUploadView(viewsets.ViewSet):
    """
    POST /api/toilets/{toilet_pk}/photos/   — upload photos to Cloudinary (admin)
    DELETE /api/toilets/{toilet_pk}/photos/{pk}/ — delete photo (admin)
    """
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAdminUser]

    def create(self, request, toilet_pk=None):
        toilet = Toilet.objects.get(pk=toilet_pk)

        files = request.FILES.getlist('photos')

        if not files:
            return Response(
                {'detail': 'No photo files provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_photos = []

        for file in files:
            result = cloudinary.uploader.upload(
                file,
                folder='toilettrail/photos',
                transformation=[
                    {
                        'width': 1080,
                        'height': 1080,
                        'crop': 'limit',
                        'quality': 'auto:good',
                    },
                ],
            )

            is_cover = not toilet.photos.filter(is_cover=True).exists()

            photo = ToiletPhoto.objects.create(
                toilet=toilet,
                uploaded_by=request.user,
                cloudinary_public_id=result['public_id'],
                image_url=result['secure_url'],
                caption=request.data.get('caption', ''),
                is_cover=is_cover,
            )

            uploaded_photos.append(photo)

        return Response(
            ToiletPhotoSerializer(uploaded_photos, many=True).data,
            status=status.HTTP_201_CREATED
        )

    def destroy(self, request, toilet_pk=None, pk=None):
        photo = ToiletPhoto.objects.get(pk=pk, toilet_id=toilet_pk)
        cloudinary.uploader.destroy(photo.cloudinary_public_id)
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ------------------------------------------------------------------ #
#  Verification Votes                                                  #
# ------------------------------------------------------------------ #
class VerificationVoteViewSet(viewsets.ViewSet):
    """
    POST /api/votes/           — cast a vote (authenticated)
    GET  /api/votes/?toilet=id — get vote counts (public)
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def list(self, request):
        toilet_id = request.query_params.get('toilet')
        if not toilet_id:
            return Response({'detail': 'toilet query param required.'}, status=status.HTTP_400_BAD_REQUEST)

        votes = VerificationVote.objects.filter(toilet_id=toilet_id)
        pos = votes.filter(is_positive=True).count()
        neg = votes.filter(is_positive=False).count()
        data = VoteCountSerializer({
            'toilet': toilet_id,
            'positive': pos,
            'negative': neg,
            'total': pos + neg,
        }).data
        return Response(data)

    def create(self, request):
        serializer = VerificationVoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        toilet_id = serializer.validated_data['toilet'].pk

        vote, created = VerificationVote.objects.update_or_create(
            toilet_id=toilet_id,
            voter=request.user,
            defaults={'is_positive': serializer.validated_data['is_positive']},
        )

        if created:
            # Update verification_count on toilet
            Toilet.objects.filter(pk=toilet_id).update(
                verification_count=VerificationVote.objects.filter(toilet_id=toilet_id, is_positive=True).count()
            )

        return Response(VerificationVoteSerializer(vote).data, status=status.HTTP_201_CREATED)