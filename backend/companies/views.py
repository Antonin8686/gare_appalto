from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import filter_by_organization, get_organization_object_or_404

from .models import Company, CompanyDocument
from .serializers import (
    CompanyDocumentExpiringSerializer,
    CompanyDocumentSerializer,
    CompanySerializer,
)
from .services.document_validity import (
    DEFAULT_EXPIRY_WARNING_DAYS,
    filter_company_documents,
    get_expiring_documents,
)


class CompanyQuerysetMixin:
    def get_queryset(self):
        return filter_by_organization(Company.objects.all(), self.request.user)


class CompanyListCreateView(CompanyQuerysetMixin, generics.ListCreateAPIView):
    serializer_class = CompanySerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["organization"] = self.request.user.organization
        return context

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            organization=self.request.user.organization,
        )


class CompanyDetailView(CompanyQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CompanySerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["organization"] = self.request.user.organization
        return context


class CompanyOwnedMixin:
    def get_company(self):
        return get_organization_object_or_404(
            Company,
            self.request.user,
            pk=self.kwargs["company_pk"],
        )


class CompanyDocumentListCreateView(CompanyOwnedMixin, generics.ListCreateAPIView):
    serializer_class = CompanyDocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        from .services.document_validity import compute_stato_validita

        base = CompanyDocument.objects.filter(company=self.get_company())
        for document in base:
            refreshed = compute_stato_validita(document.data_scadenza)
            if document.stato_validita != refreshed:
                document.stato_validita = refreshed
                document.save(update_fields=["stato_validita", "updated_at"])

        return filter_company_documents(
            CompanyDocument.objects.filter(company=self.get_company()),
            query=self.request.query_params.get("q") or None,
            categoria=self.request.query_params.get("categoria") or None,
            stato_validita=self.request.query_params.get("stato_validita") or None,
        )

    def perform_create(self, serializer):
        serializer.save(company=self.get_company())


class CompanyDocumentDetailView(CompanyOwnedMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CompanyDocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return CompanyDocument.objects.filter(company=self.get_company())

    def retrieve(self, request, *args, **kwargs):
        document = self.get_object()
        document.refresh_stato_validita()
        serializer = self.get_serializer(document)
        return Response(serializer.data)


class CompanyDocumentDownloadView(CompanyOwnedMixin, APIView):
    def get(self, request, company_pk, pk):
        document = get_object_or_404(
            CompanyDocument,
            pk=pk,
            company=self.get_company(),
        )
        if not document.file:
            return Response(
                {"detail": "File non trovato."},
                status=status.HTTP_404_NOT_FOUND,
            )

        response = FileResponse(
            document.file.open("rb"),
            as_attachment=True,
            filename=document.original_filename,
        )
        if document.content_type:
            response["Content-Type"] = document.content_type
        return response


class CompanyDocumentExpiringView(APIView):
    def get(self, request):
        try:
            days = int(request.query_params.get("days", DEFAULT_EXPIRY_WARNING_DAYS))
        except (TypeError, ValueError):
            days = DEFAULT_EXPIRY_WARNING_DAYS

        company_id = request.query_params.get("company")
        company_filter = None
        if company_id:
            try:
                company_filter = int(company_id)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "Parametro company non valido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        documents = get_expiring_documents(
            request.user.organization,
            days=days,
            company_id=company_filter,
        )
        for document in documents:
            document.refresh_stato_validita()

        serializer = CompanyDocumentExpiringSerializer(documents, many=True)
        return Response(
            {
                "days": days,
                "count": len(serializer.data),
                "documents": serializer.data,
            }
        )
