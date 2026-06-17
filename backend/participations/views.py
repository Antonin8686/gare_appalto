from accounts.tenancy import filter_by_organization, get_organization_object_or_404
from companies.models import Company
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from tenders.models import Tender

from .models import Consorzio, ImpresaAusiliaria, RTI
from .serializers import (
    ConsorzioSerializer,
    ImpresaAusiliariaSerializer,
    ParticipationAnalyzeSerializer,
    RTISerializer,
)
from .services.coverage import FORMA_SINGOLA, analyze_participation
from .services.suggestion import suggest_participation_form


class TenderOwnedMixin:
    def get_tender(self) -> Tender:
        return get_organization_object_or_404(
            Tender,
            self.request.user,
            pk=self.kwargs["tender_pk"],
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["organization"] = self.request.user.organization
        return context


class RTIListCreateView(TenderOwnedMixin, generics.ListCreateAPIView):
    serializer_class = RTISerializer

    def get_queryset(self):
        return (
            RTI.objects.filter(
                tender=self.get_tender(),
                organization=self.request.user.organization,
            )
            .select_related("mandataria")
            .prefetch_related("members__company")
        )

    def perform_create(self, serializer):
        serializer.save(
            tender=self.get_tender(),
            organization=self.request.user.organization,
        )


class RTIDetailView(TenderOwnedMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RTISerializer

    def get_queryset(self):
        return (
            RTI.objects.filter(
                tender=self.get_tender(),
                organization=self.request.user.organization,
            )
            .select_related("mandataria")
            .prefetch_related("members__company")
        )


class ConsorzioListCreateView(TenderOwnedMixin, generics.ListCreateAPIView):
    serializer_class = ConsorzioSerializer

    def get_queryset(self):
        return Consorzio.objects.filter(
            tender=self.get_tender(),
            organization=self.request.user.organization,
        ).select_related("mandataria")

    def perform_create(self, serializer):
        serializer.save(
            tender=self.get_tender(),
            organization=self.request.user.organization,
        )


class ConsorzioDetailView(TenderOwnedMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ConsorzioSerializer

    def get_queryset(self):
        return Consorzio.objects.filter(
            tender=self.get_tender(),
            organization=self.request.user.organization,
        ).select_related("mandataria")


class ImpresaAusiliariaListCreateView(TenderOwnedMixin, generics.ListCreateAPIView):
    serializer_class = ImpresaAusiliariaSerializer

    def get_queryset(self):
        return ImpresaAusiliaria.objects.filter(
            tender=self.get_tender(),
            organization=self.request.user.organization,
        ).select_related("impresa_principale", "impresa_ausiliaria")

    def perform_create(self, serializer):
        serializer.save(
            tender=self.get_tender(),
            organization=self.request.user.organization,
        )


class ImpresaAusiliariaDetailView(TenderOwnedMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ImpresaAusiliariaSerializer

    def get_queryset(self):
        return ImpresaAusiliaria.objects.filter(
            tender=self.get_tender(),
            organization=self.request.user.organization,
        ).select_related("impresa_principale", "impresa_ausiliaria")


class ParticipationAnalysisView(TenderOwnedMixin, APIView):
    def get(self, request, tender_pk):
        tender = self.get_tender()
        companies = list(
            filter_by_organization(Company.objects.all(), request.user).order_by("name")
        )
        suggestion, analysis = suggest_participation_form(tender, companies)
        return Response(
            {
                "suggerimento": suggestion.to_dict(),
                "analisi": analysis.to_dict(),
            }
        )

    def post(self, request, tender_pk):
        tender = self.get_tender()
        serializer = ParticipationAnalyzeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        companies_qs = filter_by_organization(Company.objects.all(), request.user)
        company_ids = data.get("company_ids") or []
        if company_ids:
            companies = list(companies_qs.filter(id__in=company_ids).order_by("name"))
        else:
            companies = list(companies_qs.order_by("name"))

        analysis = analyze_participation(
            tender,
            forma=data.get("forma", FORMA_SINGOLA),
            companies=companies,
            ripartizione_requisiti=data.get("ripartizione_requisiti"),
            avvalimenti=data.get("avvalimenti"),
        )
        return Response({"analisi": analysis.to_dict()}, status=status.HTTP_200_OK)
