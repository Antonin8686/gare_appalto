from django.urls import path

from .views import AiConfigView, AiGenerateView, AiGenerationListView

urlpatterns = [
    path("ai/config/", AiConfigView.as_view(), name="ai-config"),
    path("ai/generate/", AiGenerateView.as_view(), name="ai-generate"),
    path("ai/generations/", AiGenerationListView.as_view(), name="ai-generations"),
]
