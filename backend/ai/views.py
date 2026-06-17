from accounts.tenancy import filter_by_organization, get_organization_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from tenders.models import Tender

from .models import AiGeneration
from .serializers import (
    AiConfigSerializer,
    AiGenerateRequestSerializer,
    AiGenerationListSerializer,
    AiGenerationResponseSerializer,
)
from .services.generation import AiGenerationError, run_ai_generation
from .services.providers.factory import get_llm_status


class AiConfigView(APIView):
    def get(self, request):
        return Response(AiConfigSerializer(get_llm_status()).data)


class AiGenerateView(APIView):
    def post(self, request):
        serializer = AiGenerateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tender = None
        tender_id = data.get("tender_id")
        if tender_id is not None:
            tender = get_organization_object_or_404(Tender, request.user, pk=tender_id)

        company_id = data.get("company_id")
        if company_id is not None and tender is None:
            from companies.models import Company

            get_organization_object_or_404(Company, request.user, pk=company_id)

        try:
            payload = run_ai_generation(
                organization=request.user.organization,
                user=request.user,
                action=data["action"],
                tender=tender,
                company_id=company_id,
                section_id=data.get("section_id", ""),
                section_title=data.get("section_title", ""),
                section_content=data.get("section_content", ""),
                criterion_description=data.get("criterion_description", ""),
                instructions=data.get("instructions", ""),
                rag_query=data.get("rag_query", ""),
            )
        except AiGenerationError as exc:
            status_code = status.HTTP_400_BAD_REQUEST
            if exc.code == "provider_not_configured":
                status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            return Response({"detail": str(exc), "code": exc.code}, status=status_code)

        return Response(AiGenerationResponseSerializer(payload).data, status=status.HTTP_201_CREATED)


class AiGenerationListView(APIView):
    def get(self, request):
        queryset = filter_by_organization(AiGeneration.objects.all(), request.user)
        tender_id = request.query_params.get("tender_id")
        section_id = request.query_params.get("section_id")
        action = request.query_params.get("action")

        if tender_id:
            queryset = queryset.filter(tender_id=tender_id)
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        if action:
            queryset = queryset.filter(action_type=action)

        queryset = queryset.order_by("-created_at")[:50]
        serializer = AiGenerationListSerializer(queryset, many=True)
        return Response(serializer.data)
