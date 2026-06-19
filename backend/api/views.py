from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .services.analysis_hub import aggregate_analysis_hub
from .services.kpis import aggregate_kpis


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class DashboardKPIView(APIView):
    def get(self, request):
        period = request.query_params.get("period", "90d")
        if period not in ("7d", "30d", "90d", "365d", "all"):
            period = "90d"
        source = request.query_params.get("source") or None
        fase = request.query_params.get("fase") or None
        try:
            doc_days = int(request.query_params.get("doc_days", 30))
        except (TypeError, ValueError):
            doc_days = 30
        doc_days = max(1, min(doc_days, 365))

        return Response(
            aggregate_kpis(
                request.user,
                period=period,
                source=source,
                fase=fase,
                doc_days=doc_days,
            )
        )


class AnalysisHubView(APIView):
    def get(self, request):
        source = request.query_params.get("source") or None
        priorita = request.query_params.get("priorita") or None
        return Response(
            aggregate_analysis_hub(
                request.user,
                source=source,
                priorita=priorita,
            )
        )
