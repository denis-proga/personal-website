from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, TechStackViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'stacks', TechStackViewSet)

urlpatterns = [
    path('', include(router.urls)),
]