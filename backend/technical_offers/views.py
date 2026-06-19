from collections import Counter

from django.db.models import Q
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import filter_by_organization

from .models import TechnicalOffer
from .serializers import (
    TechnicalOfferFacetSerializer,
    TechnicalOfferImportResultSerializer,
    TechnicalOfferLibraryMatchSerializer,
    TechnicalOfferSerializer,
)
from .services.import_service import ImportDefaults, import_files
from .services.library_retrieval import find_library_matches


class TechnicalOfferQuerysetMixin:
    def get_queryset(self):
        queryset = filter_by_organization(TechnicalOffer.objects.all(), self.request.user)

        query = self.request.query_params.get("q")
        if query:
            queryset = queryset.filter(
                Q(title__icontains=query)
                | Q(content__icontains=query)
                | Q(tipologia_servizio__icontains=query)
                | Q(ente_appaltante__icontains=query)
                | Q(durata__icontains=query)
                | Q(rag_text__icontains=query)
            )

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)

        settore = self.request.query_params.get("settore")
        if settore:
            queryset = queryset.filter(settore=settore)

        tipologia = self.request.query_params.get("tipologia_servizio")
        if tipologia:
            queryset = queryset.filter(tipologia_servizio__icontains=tipologia)

        ente = self.request.query_params.get("ente_appaltante")
        if ente:
            queryset = queryset.filter(ente_appaltante__icontains=ente)

        anno = self.request.query_params.get("anno")
        if anno and anno.isdigit():
            queryset = queryset.filter(anno=int(anno))

        riutilizzabilita = self.request.query_params.get("riutilizzabilita")
        if riutilizzabilita and riutilizzabilita.isdigit():
            queryset = queryset.filter(riutilizzabilita=int(riutilizzabilita))

        innovativita = self.request.query_params.get("innovativita")
        if innovativita and innovativita.isdigit():
            queryset = queryset.filter(innovativita=int(innovativita))

        min_valore = self.request.query_params.get("valore_min")
        if min_valore:
            queryset = queryset.filter(valore_appalto__gte=min_valore)

        max_valore = self.request.query_params.get("valore_max")
        if max_valore:
            queryset = queryset.filter(valore_appalto__lte=max_valore)

        min_punteggio = self.request.query_params.get("punteggio_min")
        if min_punteggio:
            queryset = queryset.filter(punteggio_ottenuto__gte=min_punteggio)

        parola = self.request.query_params.get("parola_chiave")
        if parola:
            queryset = queryset.filter(
                Q(parole_chiave__icontains=parola) | Q(tags__icontains=parola)
            )

        return queryset


class TechnicalOfferListCreateView(
    TechnicalOfferQuerysetMixin,
    generics.ListCreateAPIView,
):
    serializer_class = TechnicalOfferSerializer

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            organization=self.request.user.organization,
        )


class TechnicalOfferDetailView(
    TechnicalOfferQuerysetMixin,
    generics.RetrieveUpdateDestroyAPIView,
):
    serializer_class = TechnicalOfferSerializer


class TechnicalOfferFacetView(TechnicalOfferQuerysetMixin, APIView):
    def get(self, request):
        queryset = self.get_queryset()
        category_counts = Counter(queryset.values_list("category", flat=True))
        settore_counts = Counter(
            value for value in queryset.values_list("settore", flat=True) if value
        )
        anno_counts = Counter(
            value for value in queryset.values_list("anno", flat=True) if value
        )
        payload = {
            "category": dict(category_counts),
            "settore": dict(settore_counts),
            "anni": {str(year): count for year, count in anno_counts.items()},
        }
        serializer = TechnicalOfferFacetSerializer(payload)
        return Response(serializer.data)


class TechnicalOfferImportView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        files = request.FILES.getlist("files")
        if not files:
            single = request.FILES.get("file")
            if single:
                files = [single]
        if not files:
            return Response(
                {"detail": "Carica almeno un file PDF o DOCX."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        anno = request.data.get("anno")
        defaults = ImportDefaults(
            category=request.data.get("category") or TechnicalOffer.Category.ALTRO,
            settore=request.data.get("settore") or "",
            ente_appaltante=(request.data.get("ente_appaltante") or "").strip(),
            anno=int(anno) if anno and str(anno).isdigit() else None,
            split_mode=request.data.get("split_mode") or "auto",
            tags=[
                tag.strip()
                for tag in str(request.data.get("tags") or "").split(",")
                if tag.strip()
            ],
        )

        results = import_files(
            files=files,
            owner=request.user,
            organization=request.user.organization,
            defaults=defaults,
        )
        serializer = TechnicalOfferImportResultSerializer(
            [
                {
                    "filename": item.filename,
                    "error": item.error,
                    "created": item.created,
                }
                for item in results
            ],
            many=True,
        )
        created_count = sum(len(item["created"]) for item in serializer.data)
        return Response(
            {
                "results": serializer.data,
                "created_count": created_count,
                "files_count": len(files),
            },
            status=status.HTTP_201_CREATED if created_count else status.HTTP_400_BAD_REQUEST,
        )


class TechnicalOfferLibraryMatchView(APIView):
    def get(self, request):
        section_title = (request.query_params.get("section_title") or "").strip()
        if not section_title:
            return Response(
                {"detail": "Il parametro section_title è obbligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        category = request.query_params.get("category") or ""
        tender_oggetto = request.query_params.get("tender_oggetto") or ""
        limit = request.query_params.get("limit")
        parsed_limit = int(limit) if limit and str(limit).isdigit() else 5

        matches = find_library_matches(
            organization=request.user.organization,
            section_title=section_title,
            category=category,
            tender_oggetto=tender_oggetto,
            limit=min(parsed_limit, 20),
        )
        serializer = TechnicalOfferLibraryMatchSerializer(matches, many=True)
        return Response({"results": serializer.data})
