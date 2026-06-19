from django.urls import path

from .views import (
    TechnicalOfferDetailView,
    TechnicalOfferFacetView,
    TechnicalOfferImportView,
    TechnicalOfferLibraryMatchView,
    TechnicalOfferListCreateView,
)

urlpatterns = [
    path(
        "technical-offers/",
        TechnicalOfferListCreateView.as_view(),
        name="technical-offer-list",
    ),
    path(
        "technical-offers/facets/",
        TechnicalOfferFacetView.as_view(),
        name="technical-offer-facets",
    ),
    path(
        "technical-offers/import/",
        TechnicalOfferImportView.as_view(),
        name="technical-offer-import",
    ),
    path(
        "technical-offers/matches/",
        TechnicalOfferLibraryMatchView.as_view(),
        name="technical-offer-matches",
    ),
    path(
        "technical-offers/<int:pk>/",
        TechnicalOfferDetailView.as_view(),
        name="technical-offer-detail",
    ),
]
