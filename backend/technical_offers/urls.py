from django.urls import path

from .views import (
    TechnicalOfferDetailView,
    TechnicalOfferFacetView,
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
        "technical-offers/<int:pk>/",
        TechnicalOfferDetailView.as_view(),
        name="technical-offer-detail",
    ),
]
