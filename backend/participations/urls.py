from django.urls import path

from .views import (
    ConsorzioDetailView,
    ConsorzioListCreateView,
    ImpresaAusiliariaDetailView,
    ImpresaAusiliariaListCreateView,
    ParticipationAnalysisView,
    RTIDetailView,
    RTIListCreateView,
)

urlpatterns = [
    path(
        "tenders/<int:tender_pk>/rti/",
        RTIListCreateView.as_view(),
        name="tender-rti-list",
    ),
    path(
        "tenders/<int:tender_pk>/rti/<int:pk>/",
        RTIDetailView.as_view(),
        name="tender-rti-detail",
    ),
    path(
        "tenders/<int:tender_pk>/consorzi/",
        ConsorzioListCreateView.as_view(),
        name="tender-consorzio-list",
    ),
    path(
        "tenders/<int:tender_pk>/consorzi/<int:pk>/",
        ConsorzioDetailView.as_view(),
        name="tender-consorzio-detail",
    ),
    path(
        "tenders/<int:tender_pk>/imprese-ausiliarie/",
        ImpresaAusiliariaListCreateView.as_view(),
        name="tender-impresa-ausiliaria-list",
    ),
    path(
        "tenders/<int:tender_pk>/imprese-ausiliarie/<int:pk>/",
        ImpresaAusiliariaDetailView.as_view(),
        name="tender-impresa-ausiliaria-detail",
    ),
    path(
        "tenders/<int:tender_pk>/participation-analysis/",
        ParticipationAnalysisView.as_view(),
        name="tender-participation-analysis",
    ),
]
