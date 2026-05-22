from rest_framework import viewsets, permissions, filters
from rest_framework.response import Response

from .models import Review
from .serializers import ReviewSerializer, ReviewCreateSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    """
    GET   /api/reviews/?toilet={id}  — list reviews for a toilet (public)
    POST  /api/reviews/              — create structured review (admin)
    PATCH /api/reviews/{id}/         — edit review (admin)
    DELETE is intentionally disabled — reviews are permanent audit records.
    """

    queryset = Review.objects.select_related('toilet').all()
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['visited_at', 'overall', 'cleanliness', 'created_at']
    ordering = ['-visited_at']
    http_method_names = ['get', 'post', 'patch', 'head', 'options']  # No DELETE, no PUT

    def get_queryset(self):
        qs = super().get_queryset()
        toilet_id = self.request.query_params.get('toilet')
        if toilet_id:
            qs = qs.filter(toilet_id=toilet_id)
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'partial_update'):
            return ReviewCreateSerializer
        return ReviewSerializer

    def get_permissions(self):
        if self.action in ('create', 'partial_update'):
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(reviewed_by=self.request.user)

    # After a review is created, trigger the AI content pipeline
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        toilet_id = response.data.get('toilet')
        if toilet_id:
            try:
                # from agents.tasks import generate_content
                # generate_content.delay(str(toilet_id))
                pass
            except Exception:
                pass  # Don't fail the API call if Celery is unavailable
        return response