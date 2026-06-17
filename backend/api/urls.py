from django.urls import path

from .views import DashboardKPIView, HealthView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("dashboard/kpis/", DashboardKPIView.as_view(), name="dashboard-kpis"),
]
