from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ToiletViewSet, PhotoUploadView, VerificationVoteViewSet

router = DefaultRouter()
router.register(r'toilets', ToiletViewSet, basename='toilet')
router.register(r'votes', VerificationVoteViewSet, basename='vote')

urlpatterns = [
    path('', include(router.urls)),
    # Photo upload/delete — manually nested under toilets
    path('toilets/<str:toilet_pk>/photos/', PhotoUploadView.as_view({'post': 'create'}), name='toilet-photos-list'),
    path('toilets/<str:toilet_pk>/photos/<str:pk>/', PhotoUploadView.as_view({'delete': 'destroy'}), name='toilet-photos-detail'),
]