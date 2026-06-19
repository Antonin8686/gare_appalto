from django.db.models import Q
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.tenancy import filter_by_organization, get_organization_object_or_404
from companies.models import Company

from .models import Document, EvaluationCriterion, ImportBatch, Requirement, TechnicalRelation, TechnicalRelationVersion, Tender, TenderEvaluation
from .serializers import (
    DocumentSearchRequestSerializer,
    DocumentSearchResultSerializer,
    DocumentSerializer,
    ImportBatchSerializer,
    RequirementMatrixSerializer,
    RequirementSerializer,
    EvaluationCriterionSerializer,
    EvaluationCriterionTreeSerializer,
    TechnicalRelationOutlineRequestSerializer,
    TechnicalRelationSerializer,
    TechnicalRelationValidateRequestSerializer,
    TechnicalRelationVersionSerializer,
    TenderEvaluationSerializer,
    TenderExportRequestSerializer,
    TenderSerializer,
)
from .services.evaluation import evaluate_company_for_tender
from .services.export.orchestrator import ExportError, export_full_bundle, export_tender_documents, list_export_options
from .services.requirement_matrix import build_requirement_matrix
from .services.criterion_extraction import build_criteria_tree, criteria_tree_summary
from .services.outline_generation import (
    apply_outline_to_relation,
    generate_technical_relation_outline,
    get_or_create_technical_relation,
)
from .services.technical_relation_validation import validate_technical_relation
from .services.scoring import apply_scoring_to_tender
from .services.search import search_similar_documents
from .services.technical_relation_versioning import (
    restore_technical_relation_version,
    snapshot_technical_relation,
)


class TenderQuerysetMixin:
    def get_queryset(self):
        queryset = filter_by_organization(
            Tender.objects.select_related("import_batch"),
            self.request.user,
        )

        imported = self.request.query_params.get("imported")
        if imported and imported.lower() in ("true", "1", "yes"):
            queryset = queryset.exclude(source=Tender.Source.MANUAL)

        source = self.request.query_params.get("source")
        if source:
            sources = [item.strip() for item in source.split(",") if item.strip()]
            queryset = queryset.filter(source__in=sources)

        priorita = self.request.query_params.get("priorita")
        if priorita:
            priorita_values = [item.strip() for item in priorita.split(",") if item.strip()]
            queryset = queryset.filter(priorita__in=priorita_values)

        fase = self.request.query_params.get("fase")
        if fase:
            fase_values = [item.strip() for item in fase.split(",") if item.strip()]
            queryset = queryset.filter(fase__in=fase_values)

        if self.request.query_params.get("scouting"):
            queryset = queryset.filter(source=Tender.Source.SCOUTING).order_by(
                "-priority_score", "-scadenza"
            )

        return queryset


class TenderListCreateView(TenderQuerysetMixin, generics.ListCreateAPIView):
    serializer_class = TenderSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["organization"] = self.request.user.organization
        return context

    def perform_create(self, serializer):
        tender = serializer.save(
            owner=self.request.user,
            organization=self.request.user.organization,
        )
        apply_scoring_to_tender(tender)


class TenderDetailView(TenderQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TenderSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["organization"] = self.request.user.organization
        return context

    def perform_update(self, serializer):
        tender = serializer.save()
        apply_scoring_to_tender(tender)


class TenderOwnedMixin:
    def get_tender(self):
        return get_organization_object_or_404(
            Tender,
            self.request.user,
            pk=self.kwargs["tender_pk"],
        )


class DocumentListCreateView(TenderOwnedMixin, generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Document.objects.filter(tender=self.get_tender())

    def list(self, request, *args, **kwargs):
        from .services.document_processing import ensure_documents_processed

        ensure_documents_processed(self.get_tender())
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(tender=self.get_tender())


class DocumentDetailView(TenderOwnedMixin, generics.RetrieveDestroyAPIView):
    serializer_class = DocumentSerializer

    def get_queryset(self):
        return Document.objects.filter(tender=self.get_tender())


class DocumentDownloadView(TenderOwnedMixin, APIView):
    def get(self, request, tender_pk, pk):
        document = get_object_or_404(
            Document,
            pk=pk,
            tender=self.get_tender(),
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


class RequirementListView(TenderOwnedMixin, generics.ListAPIView):
    serializer_class = RequirementSerializer

    def get_queryset(self):
        queryset = Requirement.objects.filter(tender=self.get_tender()).select_related(
            "document"
        )

        categoria = self.request.query_params.get("categoria")
        if categoria:
            queryset = queryset.filter(categoria=categoria)

        tipo = self.request.query_params.get("tipo")
        if tipo:
            queryset = queryset.filter(tipo=tipo)

        query = self.request.query_params.get("q")
        if query:
            from django.db.models import Q

            queryset = queryset.filter(
                Q(descrizione__icontains=query)
                | Q(note_interpretative__icontains=query)
                | Q(documento_origine__icontains=query)
                | Q(soglia_minima__icontains=query)
            )

        obbligatorio = self.request.query_params.get("obbligatorio")
        if obbligatorio is not None and obbligatorio.lower() in ("true", "1", "yes"):
            queryset = queryset.filter(obbligatorio=True)

        return queryset


class RequirementDetailView(TenderOwnedMixin, generics.RetrieveAPIView):
    serializer_class = RequirementSerializer

    def get_queryset(self):
        return Requirement.objects.filter(tender=self.get_tender()).select_related(
            "document"
        )


class RequirementMatrixView(TenderOwnedMixin, APIView):
    def get(self, request, tender_pk):
        tender = self.get_tender()
        companies = list(
            filter_by_organization(Company.objects.all(), request.user).order_by("name")
        )

        company_param = request.query_params.get("company")
        company_ids = None
        if company_param:
            company_ids = [
                int(item)
                for item in company_param.split(",")
                if item.strip().isdigit()
            ]

        matrix = build_requirement_matrix(
            tender,
            companies,
            query=request.query_params.get("q", ""),
            categoria=request.query_params.get("categoria", ""),
            tipo=request.query_params.get("tipo", ""),
            esito=request.query_params.get("esito", ""),
            company_ids=company_ids,
        )
        serializer = RequirementMatrixSerializer(matrix.to_dict())
        return Response(serializer.data)


class EvaluationCriterionTreeView(TenderOwnedMixin, APIView):
    def get(self, request, tender_pk):
        tender = self.get_tender()
        queryset = (
            EvaluationCriterion.objects.filter(tender=tender)
            .select_related("document")
            .order_by("ordine", "id")
        )

        livello = request.query_params.get("livello")
        if livello:
            queryset = queryset.filter(livello=livello)

        document_id = request.query_params.get("document")
        if document_id and document_id.isdigit():
            queryset = queryset.filter(document_id=int(document_id))

        query = request.query_params.get("q")
        criteria_list = list(queryset)
        if query:
            matched = list(
                EvaluationCriterion.objects.filter(tender=tender)
                .filter(Q(titolo__icontains=query) | Q(descrizione__icontains=query))
                .select_related("document")
            )
            include_ids: set[int] = set()
            for item in matched:
                include_ids.add(item.id)
                parent_id = item.parent_id
                while parent_id:
                    include_ids.add(parent_id)
                    parent_id = (
                        EvaluationCriterion.objects.filter(pk=parent_id)
                        .values_list("parent_id", flat=True)
                        .first()
                    )
            criteria_list = list(
                EvaluationCriterion.objects.filter(tender=tender, id__in=include_ids)
                .select_related("document")
                .order_by("ordine", "id")
            )

        tree = build_criteria_tree(criteria_list)
        payload = {
            "criteria": tree,
            "summary": criteria_tree_summary(tree),
        }
        serializer = EvaluationCriterionTreeSerializer(payload)
        return Response(serializer.data)


class EvaluationCriterionDetailView(TenderOwnedMixin, generics.RetrieveAPIView):
    serializer_class = EvaluationCriterionSerializer

    def get_queryset(self):
        return EvaluationCriterion.objects.filter(tender=self.get_tender()).select_related(
            "document"
        )


class TenderEvaluationListView(TenderOwnedMixin, generics.ListAPIView):
    serializer_class = TenderEvaluationSerializer

    def get_queryset(self):
        return TenderEvaluation.objects.filter(
            tender=self.get_tender(),
            company__organization=self.request.user.organization,
        ).select_related("company")


class TenderEvaluationRunView(TenderOwnedMixin, APIView):
    def post(self, request, tender_pk):
        tender = self.get_tender()
        companies = filter_by_organization(
            Company.objects.all(),
            request.user,
        ).order_by("name")

        if not companies.exists():
            return Response(
                {"detail": "Nessuna azienda registrata. Aggiungi un'azienda per valutare la compatibilità."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        evaluations = []
        for company in companies:
            result = evaluate_company_for_tender(company, tender)
            evaluation, _ = TenderEvaluation.objects.update_or_create(
                tender=tender,
                company=company,
                defaults={
                    "semaforo": result.semaforo,
                    "motivazione": result.motivazione,
                    "dettagli": [item.to_dict() for item in result.dettagli],
                },
            )
            evaluations.append(evaluation)

        apply_scoring_to_tender(tender)

        serializer = TenderEvaluationSerializer(evaluations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ImportBatchQuerysetMixin:
    def get_queryset(self):
        return filter_by_organization(ImportBatch.objects.all(), self.request.user)


class ScoutingImportListCreateView(ImportBatchQuerysetMixin, generics.ListCreateAPIView):
    serializer_class = ImportBatchSerializer
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            organization=self.request.user.organization,
            source=ImportBatch.Source.SCOUTING,
        )


class TelematImportListCreateView(ImportBatchQuerysetMixin, generics.ListCreateAPIView):
    serializer_class = ImportBatchSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["import_source"] = ImportBatch.Source.TELEMAT
        return context

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            organization=self.request.user.organization,
            source=ImportBatch.Source.TELEMAT,
        )


class WelfareImportListCreateView(ImportBatchQuerysetMixin, generics.ListCreateAPIView):
    serializer_class = ImportBatchSerializer
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            organization=self.request.user.organization,
            source=ImportBatch.Source.WELFARE,
        )


class ScoutingScoreView(APIView):
    def post(self, request):
        tenders = filter_by_organization(
            Tender.objects.filter(source=Tender.Source.SCOUTING),
            request.user,
        )
        scored = 0
        counts = {"alta": 0, "media": 0, "bassa": 0}
        for tender in tenders:
            result = apply_scoring_to_tender(tender)
            scored += 1
            counts[result.priorita] = counts.get(result.priorita, 0) + 1

        return Response(
            {
                "scored": scored,
                "counts": counts,
            },
            status=status.HTTP_200_OK,
        )


class DocumentSearchView(APIView):
    def post(self, request):
        serializer = DocumentSearchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        query = serializer.validated_data["query"]
        limit = serializer.validated_data.get("limit", 10)
        fase = serializer.validated_data.get("fase") or None

        matches = search_similar_documents(
            organization=request.user.organization,
            query=query,
            limit=limit,
            fase=fase,
        )

        payload = [
            {
                "id": item["document"].id,
                "chunk_id": item["chunk"].id if item["chunk"] else None,
                "name": item["document"].name,
                "original_filename": item["document"].original_filename,
                "excerpt": item["excerpt"],
                "similarity": item["similarity"],
                "tender": item["document"].tender,
            }
            for item in matches
        ]

        result_serializer = DocumentSearchResultSerializer(payload, many=True)
        return Response({"results": result_serializer.data}, status=status.HTTP_200_OK)


class TechnicalRelationDetailView(TenderOwnedMixin, APIView):
    def get(self, request, tender_pk):
        relation = get_or_create_technical_relation(self.get_tender())
        serializer = TechnicalRelationSerializer(relation)
        return Response(serializer.data)

    def patch(self, request, tender_pk):
        relation = get_or_create_technical_relation(self.get_tender())
        serializer = TechnicalRelationSerializer(
            relation,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        snapshot_technical_relation(
            relation,
            created_by=request.user,
            change_note="Aggiornamento manuale sezioni",
        )
        return Response(serializer.data)


class TechnicalRelationVersionListView(TenderOwnedMixin, APIView):
    def get(self, request, tender_pk):
        relation = get_or_create_technical_relation(self.get_tender())
        versions = TechnicalRelationVersion.objects.filter(relation=relation).select_related(
            "created_by", "company"
        )
        serializer = TechnicalRelationVersionSerializer(versions, many=True)
        return Response(serializer.data)


class TechnicalRelationVersionRestoreView(TenderOwnedMixin, APIView):
    def post(self, request, tender_pk, version):
        relation = get_or_create_technical_relation(self.get_tender())
        restore_technical_relation_version(
            relation,
            int(version),
            created_by=request.user,
        )
        serializer = TechnicalRelationSerializer(relation)
        return Response(serializer.data)


class TechnicalRelationValidateView(TenderOwnedMixin, APIView):
    def post(self, request, tender_pk):
        tender = self.get_tender()
        relation = get_or_create_technical_relation(tender)

        body_serializer = TechnicalRelationValidateRequestSerializer(data=request.data)
        body_serializer.is_valid(raise_exception=True)

        sections = body_serializer.validated_data.get("sections")
        result = validate_technical_relation(
            tender,
            relation,
            sections=sections,
        )
        return Response(result.to_dict(), status=status.HTTP_200_OK)


class TechnicalRelationOutlineGenerateView(TenderOwnedMixin, APIView):
    def post(self, request, tender_pk):
        tender = self.get_tender()
        body_serializer = TechnicalRelationOutlineRequestSerializer(data=request.data)
        body_serializer.is_valid(raise_exception=True)

        company = None
        company_id = body_serializer.validated_data.get("company_id")
        if company_id is not None:
            company = get_organization_object_or_404(Company, request.user, pk=company_id)

        outline = generate_technical_relation_outline(tender, company=company)
        relation = get_or_create_technical_relation(tender)
        if company is not None:
            relation.company = company
            relation.save(update_fields=["company", "updated_at"])

        apply_outline_to_relation(relation, outline)
        snapshot_technical_relation(
            relation,
            created_by=request.user,
            change_note="Generazione outline",
        )
        serializer = TechnicalRelationSerializer(relation)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TenderExportOptionsView(TenderOwnedMixin, APIView):
    def get(self, request, tender_pk):
        self.get_tender()
        return Response(list_export_options())


class TenderExportView(TenderOwnedMixin, APIView):
    def post(self, request, tender_pk):
        tender = self.get_tender()
        serializer = TenderExportRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        participation = data.get("participation")
        participation_params = participation if participation else None
        matrix_company_ids = data.get("matrix_company_ids") or None
        fmt = data["format"]

        try:
            if data.get("bundle"):
                export_file = export_full_bundle(
                    tender,
                    request.user,
                    fmt=fmt,
                    participation_params=participation_params,
                    matrix_company_ids=matrix_company_ids,
                )
            else:
                export_file = export_tender_documents(
                    tender,
                    request.user,
                    items=data.get("items") or [],
                    fmt=fmt,
                    participation_params=participation_params,
                    matrix_company_ids=matrix_company_ids,
                )
        except ExportError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response = HttpResponse(export_file.content, content_type=export_file.content_type)
        response["Content-Disposition"] = f'attachment; filename="{export_file.filename}"'
        return response
