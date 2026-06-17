from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    RagContextualSearchRequestSerializer,
    RagReindexRequestSerializer,
    RagRetrieveSourcesRequestSerializer,
    RagSearchRequestSerializer,
    RagSearchResponseSerializer,
)
from .services.indexing import reindex_organization
from .services.search import build_search_response, contextual_search, retrieve_sources, semantic_search
from .tasks import reindex_organization_task


class RagSearchView(APIView):
    def post(self, request):
        serializer = RagSearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        hits = semantic_search(
            organization=request.user.organization,
            query=serializer.validated_data["query"],
            limit=serializer.validated_data.get("limit", 10),
            source_types=serializer.validated_data.get("source_types") or None,
        )
        payload = build_search_response(hits)
        return Response(RagSearchResponseSerializer(payload).data, status=status.HTTP_200_OK)


class RagContextualSearchView(APIView):
    def post(self, request):
        serializer = RagContextualSearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        hits = contextual_search(
            organization=request.user.organization,
            query=serializer.validated_data["query"],
            limit=serializer.validated_data.get("limit", 10),
            tender_id=serializer.validated_data.get("tender_id"),
            company_id=serializer.validated_data.get("company_id"),
            source_types=serializer.validated_data.get("source_types") or None,
        )
        payload = build_search_response(hits)
        return Response(RagSearchResponseSerializer(payload).data, status=status.HTTP_200_OK)


class RagRetrieveSourcesView(APIView):
    def post(self, request):
        serializer = RagRetrieveSourcesRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payload = retrieve_sources(
            organization=request.user.organization,
            chunk_ids=serializer.validated_data.get("chunk_ids"),
            sources=serializer.validated_data.get("sources"),
        )
        return Response(RagSearchResponseSerializer(payload).data, status=status.HTTP_200_OK)


class RagReindexView(APIView):
    def post(self, request):
        serializer = RagReindexRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        scope = serializer.validated_data["scope"]
        if serializer.validated_data.get("async_task"):
            task = reindex_organization_task.delay(request.user.organization_id, scope=scope)
            return Response(
                {"task_id": task.id, "scope": scope, "status": "queued"},
                status=status.HTTP_202_ACCEPTED,
            )

        counts = reindex_organization(request.user.organization, scope=scope)
        return Response({"scope": scope, "counts": counts}, status=status.HTTP_200_OK)
