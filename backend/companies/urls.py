from django.urls import path

from .views import (
    CompanyDetailView,
    CompanyDocumentDetailView,
    CompanyDocumentDownloadView,
    CompanyDocumentExpiringView,
    CompanyDocumentListCreateView,
    CompanyListCreateView,
)

urlpatterns = [
    path(
        "companies/documents/expiring/",
        CompanyDocumentExpiringView.as_view(),
        name="company-documents-expiring",
    ),
    path("companies/", CompanyListCreateView.as_view(), name="company-list"),
    path("companies/<int:pk>/", CompanyDetailView.as_view(), name="company-detail"),
    path(
        "companies/<int:company_pk>/documents/",
        CompanyDocumentListCreateView.as_view(),
        name="company-document-list",
    ),
    path(
        "companies/<int:company_pk>/documents/<int:pk>/",
        CompanyDocumentDetailView.as_view(),
        name="company-document-detail",
    ),
    path(
        "companies/<int:company_pk>/documents/<int:pk>/download/",
        CompanyDocumentDownloadView.as_view(),
        name="company-document-download",
    ),
]
