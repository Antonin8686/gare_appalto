from django.urls import path

from .views import AnalysisHubView, DashboardKPIView, HealthView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("dashboard/kpis/", DashboardKPIView.as_view(), name="dashboard-kpis"),
    path("analysis-hub/", AnalysisHubView.as_view(), name="analysis-hub"),
]
