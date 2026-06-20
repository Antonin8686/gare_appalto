import logging
import os

from rest_framework import serializers

from companies.models import Company

from .models import Document, EvaluationCriterion, ImportBatch, Requirement, EconomicRelation, EconomicRelationVersion, TechnicalRelation, TechnicalRelationVersion, Tender, TenderEvaluation, default_formal_rules
from .tasks import process_import_batch, process_import_batch_sync

logger = logging.getLogger(__name__)

FORMAL_RULE_CATEGORIES = ("pagine", "font", "margini", "allegati")


class TenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tender
        fields = (
            "id",
            "cig",
            "cpv",
            "importo",
            "scadenza",
            "stato",
            "fase",
            "source",
            "oggetto",
            "import_batch_id",
            "import_filename",
            "imported_at",
            "ai_extracted",
            "extracted_at",
            "formal_rules",
            "priorita",
            "priority_score",
            "stazione_appaltante",
            "durata",
            "document_url",
            "scheda_generated_at",
            "has_scheda",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "source",
            "oggetto",
            "import_batch_id",
            "import_filename",
            "imported_at",
            "ai_extracted",
            "extracted_at",
            "priorita",
            "priority_score",
            "stazione_appaltante",
            "durata",
            "document_url",
            "scheda_generated_at",
            "has_scheda",
            "created_at",
            "updated_at",
        )

    import_filename = serializers.SerializerMethodField()
    imported_at = serializers.SerializerMethodField()
    has_scheda = serializers.SerializerMethodField()

    def get_import_filename(self, obj: Tender) -> str | None:
        if obj.import_batch_id:
            return obj.import_batch.original_filename
        return None

    def get_imported_at(self, obj: Tender) -> str | None:
        if obj.import_batch_id:
            return obj.import_batch.uploaded_at.isoformat()
        return None

    def get_has_scheda(self, obj: Tender) -> bool:
        return bool(obj.scheda) and bool(obj.scheda_generated_at)

    def validate_formal_rules(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("formal_rules deve essere un oggetto.")

        cleaned = default_formal_rules()
        for category in FORMAL_RULE_CATEGORIES:
            items = value.get(category, [])
            if not isinstance(items, list):
                raise serializers.ValidationError(
                    f"formal_rules.{category} deve essere una lista."
                )

            cleaned_items = []
            seen_ids: set[str] = set()
            for index, item in enumerate(items):
                if not isinstance(item, dict):
                    raise serializers.ValidationError(
                        f"Ogni elemento di formal_rules.{category} deve essere un oggetto."
                    )

                item_id = str(item.get("id", "")).strip()
                if not item_id:
                    raise serializers.ValidationError(
                        f"formal_rules.{category}[{index}].id è obbligatorio."
                    )
                if item_id in seen_ids:
                    raise serializers.ValidationError(
                        f"ID duplicato in formal_rules.{category}: {item_id}"
                    )
                seen_ids.add(item_id)

                label = str(item.get("label", "")).strip()
                if not label:
                    raise serializers.ValidationError(
                        f"formal_rules.{category}[{index}].label è obbligatorio."
                    )

                detail = str(item.get("detail", "")).strip()
                checked = item.get("checked", False)
                if not isinstance(checked, bool):
                    raise serializers.ValidationError(
                        f"formal_rules.{category}[{index}].checked deve essere booleano."
                    )

                cleaned_items.append(
                    {
                        "id": item_id,
                        "label": label,
                        "detail": detail,
                        "checked": checked,
                    }
                )

            cleaned[category] = cleaned_items

        return cleaned

    def validate_cig(self, value):
        cleaned = value.strip().upper()
        if not cleaned:
            raise serializers.ValidationError("Il CIG è obbligatorio.")
        if len(cleaned) > 10:
            raise serializers.ValidationError("Il CIG non può superare 10 caratteri.")

        organization = self.context.get("organization")
        if organization:
            queryset = Tender.objects.filter(organization=organization, cig=cleaned)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError("Esiste già una gara con questo CIG nell'organizzazione.")
        return cleaned

    def validate_cpv(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Il CPV è obbligatorio.")
        if len(cleaned) > 8:
            raise serializers.ValidationError("Il CPV non può superare 8 caratteri.")
        return cleaned


class DocumentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)
    name = serializers.CharField(required=False, allow_blank=True, max_length=255)

    class Meta:
        model = Document
        fields = (
            "id",
            "name",
            "doc_type",
            "file",
            "original_filename",
            "content_type",
            "file_size",
            "status",
            "text_content",
            "error_message",
            "validation_issues",
            "uploaded_at",
        )
        read_only_fields = (
            "id",
            "doc_type",
            "original_filename",
            "content_type",
            "file_size",
            "status",
            "text_content",
            "error_message",
            "validation_issues",
            "uploaded_at",
        )

    def validate_file(self, value):
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in Document.ALLOWED_EXTENSIONS:
            allowed = ", ".join(sorted(Document.ALLOWED_EXTENSIONS))
            raise serializers.ValidationError(
                f"Tipo file non supportato. Formati ammessi: {allowed}"
            )
        return value

    def create(self, validated_data):
        uploaded_file = validated_data["file"]
        name = validated_data.get("name") or os.path.splitext(uploaded_file.name)[0]
        from .services.document_types import infer_doc_type

        document = Document.objects.create(
            tender=validated_data["tender"],
            name=name,
            doc_type=infer_doc_type(uploaded_file.name),
            file=uploaded_file,
            original_filename=uploaded_file.name,
            content_type=getattr(uploaded_file, "content_type", "") or "",
            file_size=uploaded_file.size,
            status=Document.Status.PROCESSING,
        )
        from .services.document_processing import process_uploaded_document

        return process_uploaded_document(document)


class ImportBatchSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)

    class Meta:
        model = ImportBatch
        fields = (
            "id",
            "source",
            "file",
            "original_filename",
            "content_type",
            "file_size",
            "status",
            "tenders_created",
            "tenders_updated",
            "error_message",
            "uploaded_at",
        )
        read_only_fields = (
            "id",
            "source",
            "original_filename",
            "content_type",
            "file_size",
            "status",
            "tenders_created",
            "tenders_updated",
            "error_message",
            "uploaded_at",
        )

    def validate_file(self, value):
        ext = os.path.splitext(value.name)[1].lower()
        source = self.context.get("import_source")
        allowed = ImportBatch.get_allowed_extensions(source)
        if ext not in allowed:
            allowed_label = ", ".join(sorted(allowed))
            raise serializers.ValidationError(
                f"Tipo file non supportato. Formati ammessi: {allowed_label}"
            )
        return value

    def create(self, validated_data):
        uploaded_file = validated_data["file"]
        batch = ImportBatch.objects.create(
            owner=validated_data["owner"],
            organization=validated_data.get("organization") or validated_data["owner"].organization,
            source=validated_data["source"],
            file=uploaded_file,
            original_filename=uploaded_file.name,
            content_type=getattr(uploaded_file, "content_type", "") or "",
            file_size=uploaded_file.size,
            status=ImportBatch.Status.PROCESSING,
        )
        try:
            process_import_batch.delay(batch.id)
        except Exception:
            logger.warning(
                "Celery non disponibile: elaborazione import %s in sincrono",
                batch.id,
                exc_info=True,
            )
            try:
                process_import_batch_sync(batch.id)
            except Exception as exc:
                batch.status = ImportBatch.Status.FAILED
                batch.error_message = str(exc)
                batch.save(update_fields=["status", "error_message"])
        batch.refresh_from_db()
        return batch


class RequirementSerializer(serializers.ModelSerializer):
    document_name = serializers.SerializerMethodField()
    categoria_label = serializers.CharField(source="get_categoria_display", read_only=True)
    tipo_label = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = Requirement
        fields = (
            "id",
            "tipo",
            "tipo_label",
            "categoria",
            "categoria_label",
            "descrizione",
            "soglia",
            "soglia_minima",
            "obbligatorio",
            "premiante",
            "migliorativo",
            "document",
            "document_name",
            "documento_origine",
            "pagina_origine",
            "paragrafo_origine",
            "modalita_comprova",
            "soggetto_obbligato",
            "avvalimento_consentito",
            "rti_consentito",
            "consorzio_consentito",
            "note_interpretative",
            "created_at",
        )
        read_only_fields = (
            "id",
            "document",
            "document_name",
            "categoria_label",
            "tipo_label",
            "created_at",
        )

    def get_document_name(self, obj: Requirement) -> str | None:
        if obj.document_id:
            return obj.document.name or obj.document.original_filename
        return obj.documento_origine or None


class EvaluationCriterionSerializer(serializers.ModelSerializer):
    livello_label = serializers.CharField(source="get_livello_display", read_only=True)
    document_name = serializers.SerializerMethodField()

    class Meta:
        model = EvaluationCriterion
        fields = (
            "id",
            "livello",
            "livello_label",
            "titolo",
            "descrizione",
            "punteggio_massimo",
            "punteggio_discrezionale",
            "punteggio_tabellare",
            "soglia_minima",
            "elementi_premianti",
            "document",
            "document_name",
            "documento_origine",
            "pagina_origine",
            "paragrafo_origine",
            "parent",
            "ordine",
            "created_at",
        )
        read_only_fields = fields

    def get_document_name(self, obj: EvaluationCriterion) -> str | None:
        if obj.document_id:
            return obj.document.name or obj.document.original_filename
        return obj.documento_origine or None


class EvaluationCriterionTreeSerializer(serializers.Serializer):
    criteria = serializers.ListField()
    summary = serializers.DictField()


class RequirementEvaluationSerializer(serializers.Serializer):
    requirement_id = serializers.IntegerField()
    tipo = serializers.CharField()
    descrizione = serializers.CharField()
    soglia = serializers.CharField()
    esito = serializers.CharField()
    motivo = serializers.CharField()
    evidenza = serializers.DictField(required=False)


class RequirementMatrixCompanySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class RequirementMatrixCellSerializer(serializers.Serializer):
    company_id = serializers.IntegerField()
    company_name = serializers.CharField()
    esito = serializers.CharField()
    esito_label = serializers.CharField()
    semaforo = serializers.CharField()
    valore_posseduto = serializers.CharField()
    valore_richiesto = serializers.CharField()
    motivazione = serializers.CharField()


class RequirementMatrixRowSerializer(serializers.Serializer):
    requirement_id = serializers.IntegerField()
    tipo = serializers.CharField()
    tipo_label = serializers.CharField()
    categoria = serializers.CharField()
    categoria_label = serializers.CharField()
    descrizione = serializers.CharField()
    soglia_minima = serializers.CharField()
    cells = RequirementMatrixCellSerializer(many=True)


class RequirementMatrixSerializer(serializers.Serializer):
    tender_id = serializers.IntegerField()
    tender_cig = serializers.CharField()
    companies = RequirementMatrixCompanySerializer(many=True)
    requirements = RequirementMatrixRowSerializer(many=True)
    summary = serializers.DictField(child=serializers.IntegerField())


class TenderEvaluationSerializer(serializers.ModelSerializer):
    company_id = serializers.IntegerField(source="company.id", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = TenderEvaluation
        fields = (
            "id",
            "company_id",
            "company_name",
            "semaforo",
            "motivazione",
            "dettagli",
            "evaluated_at",
        )
        read_only_fields = fields


class TenderSearchSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Tender
        fields = (
            "id",
            "cig",
            "cpv",
            "oggetto",
            "fase",
            "stato",
            "scadenza",
            "importo",
            "priorita",
        )


class DocumentSearchResultSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    chunk_id = serializers.IntegerField(allow_null=True, required=False)
    name = serializers.CharField()
    original_filename = serializers.CharField()
    excerpt = serializers.CharField()
    similarity = serializers.FloatField()
    tender = TenderSearchSummarySerializer()


class DocumentSearchRequestSerializer(serializers.Serializer):
    query = serializers.CharField(min_length=2, max_length=2000)
    limit = serializers.IntegerField(min_value=1, max_value=50, default=10, required=False)
    fase = serializers.ChoiceField(
        choices=Tender.Fase.choices,
        required=False,
        allow_null=True,
        allow_blank=True,
    )


class TechnicalRelationSectionSerializer(serializers.Serializer):
    id = serializers.CharField()
    criterion_id = serializers.CharField(required=False, allow_blank=True)
    title = serializers.CharField()
    category = serializers.CharField(required=False, allow_blank=True)
    content = serializers.CharField(allow_blank=True)
    order = serializers.IntegerField(min_value=1)
    suggested_pages = serializers.IntegerField(min_value=0, required=False)
    completed = serializers.BooleanField()


class TechnicalRelationSerializer(serializers.ModelSerializer):
    company_id = serializers.PrimaryKeyRelatedField(
        source="company",
        queryset=Company.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = TechnicalRelation
        fields = (
            "id",
            "tender",
            "company_id",
            "outline",
            "sections",
            "generated_at",
            "auto_generated",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "tender",
            "outline",
            "generated_at",
            "auto_generated",
            "created_at",
            "updated_at",
        )

    def validate_sections(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("sections deve essere una lista.")

        cleaned = []
        seen_ids: set[str] = set()
        for index, item in enumerate(value):
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    f"sections[{index}] deve essere un oggetto."
                )

            section_id = str(item.get("id", "")).strip()
            if not section_id:
                raise serializers.ValidationError(
                    f"sections[{index}].id è obbligatorio."
                )
            if section_id in seen_ids:
                raise serializers.ValidationError(
                    f"ID duplicato in sections: {section_id}"
                )
            seen_ids.add(section_id)

            title = str(item.get("title", "")).strip()
            if not title:
                raise serializers.ValidationError(
                    f"sections[{index}].title è obbligatorio."
                )

            content = str(item.get("content", ""))
            order = item.get("order", index + 1)
            if not isinstance(order, int) or order < 1:
                raise serializers.ValidationError(
                    f"sections[{index}].order deve essere un intero positivo."
                )

            completed = item.get("completed", False)
            if not isinstance(completed, bool):
                raise serializers.ValidationError(
                    f"sections[{index}].completed deve essere booleano."
                )

            cleaned.append(
                {
                    "id": section_id,
                    "criterion_id": str(item.get("criterion_id", "")).strip(),
                    "title": title,
                    "category": str(item.get("category", "")).strip(),
                    "content": content,
                    "order": order,
                    "suggested_pages": int(item.get("suggested_pages", 0) or 0),
                    "completed": completed,
                }
            )

        cleaned.sort(key=lambda s: s["order"])
        return cleaned

    def validate_company_id(self, company):
        if company is None:
            return company
        request = self.context.get("request")
        if request and company.organization_id != request.user.organization_id:
            raise serializers.ValidationError("Azienda non trovata.")
        return company


class TechnicalRelationVersionSerializer(serializers.ModelSerializer):
    company_id = serializers.IntegerField(source="company.id", read_only=True, allow_null=True)
    company_name = serializers.CharField(source="company.name", read_only=True, allow_null=True)
    created_by_email = serializers.CharField(source="created_by.email", read_only=True, allow_null=True)

    class Meta:
        model = TechnicalRelationVersion
        fields = (
            "id",
            "version",
            "company_id",
            "company_name",
            "outline",
            "sections",
            "change_note",
            "created_by_email",
            "created_at",
        )
        read_only_fields = fields


class TechnicalRelationOutlineRequestSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(required=False, allow_null=True)


class TechnicalRelationValidateRequestSerializer(serializers.Serializer):
    sections = TechnicalRelationSectionSerializer(many=True, required=False)


class EconomicRelationLineItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    voce = serializers.CharField()
    descrizione = serializers.CharField(required=False, allow_blank=True)
    unita_misura = serializers.CharField(required=False, allow_blank=True)
    quantita = serializers.CharField(required=False, allow_blank=True)
    prezzo_unitario = serializers.CharField(required=False, allow_blank=True)
    importo = serializers.CharField(required=False, allow_blank=True)
    ribasso_percentuale = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    order = serializers.IntegerField(min_value=1)
    completed = serializers.BooleanField()
    source = serializers.CharField(required=False, allow_blank=True)


class EconomicRelationSerializer(serializers.ModelSerializer):
    company_id = serializers.PrimaryKeyRelatedField(
        source="company",
        queryset=Company.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = EconomicRelation
        fields = (
            "id",
            "tender",
            "company_id",
            "outline",
            "line_items",
            "generated_at",
            "auto_generated",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "tender",
            "outline",
            "generated_at",
            "auto_generated",
            "created_at",
            "updated_at",
        )

    def validate_line_items(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("line_items deve essere una lista.")

        cleaned = []
        seen_ids: set[str] = set()
        for index, item in enumerate(value):
            if not isinstance(item, dict):
                raise serializers.ValidationError(f"line_items[{index}] deve essere un oggetto.")

            item_id = str(item.get("id", "")).strip()
            if not item_id:
                raise serializers.ValidationError(f"line_items[{index}].id è obbligatorio.")
            if item_id in seen_ids:
                raise serializers.ValidationError(f"ID duplicato in line_items: {item_id}")
            seen_ids.add(item_id)

            voce = str(item.get("voce", "")).strip()
            if not voce:
                raise serializers.ValidationError(f"line_items[{index}].voce è obbligatorio.")

            order = item.get("order", index + 1)
            if not isinstance(order, int) or order < 1:
                raise serializers.ValidationError(f"line_items[{index}].order deve essere positivo.")

            cleaned.append(
                {
                    "id": item_id,
                    "voce": voce,
                    "descrizione": str(item.get("descrizione", "")),
                    "unita_misura": str(item.get("unita_misura", "a corpo")),
                    "quantita": str(item.get("quantita", "1")),
                    "prezzo_unitario": str(item.get("prezzo_unitario", "")),
                    "importo": str(item.get("importo", "")),
                    "ribasso_percentuale": str(item.get("ribasso_percentuale", "")),
                    "notes": str(item.get("notes", "")),
                    "order": order,
                    "completed": bool(item.get("completed", False)),
                    "source": str(item.get("source", "")),
                }
            )

        cleaned.sort(key=lambda row: row["order"])
        return cleaned

    def validate_company_id(self, company):
        if company is None:
            return company
        request = self.context.get("request")
        if request and company.organization_id != request.user.organization_id:
            raise serializers.ValidationError("Azienda non trovata.")
        return company


class EconomicRelationVersionSerializer(serializers.ModelSerializer):
    company_id = serializers.IntegerField(source="company.id", read_only=True, allow_null=True)
    company_name = serializers.CharField(source="company.name", read_only=True, allow_null=True)
    created_by_email = serializers.CharField(source="created_by.email", read_only=True, allow_null=True)

    class Meta:
        model = EconomicRelationVersion
        fields = (
            "id",
            "version",
            "company_id",
            "company_name",
            "outline",
            "line_items",
            "change_note",
            "created_by_email",
            "created_at",
        )
        read_only_fields = fields


class EconomicRelationOutlineRequestSerializer(serializers.Serializer):
    company_id = serializers.IntegerField(required=False, allow_null=True)


class EconomicRelationValidateRequestSerializer(serializers.Serializer):
    line_items = EconomicRelationLineItemSerializer(many=True, required=False)


class TenderOffersAutoGenerateRequestSerializer(serializers.Serializer):
    force = serializers.BooleanField(default=False, required=False)


class TenderExportParticipationSerializer(serializers.Serializer):
    forma = serializers.ChoiceField(
        choices=["singola", "rti", "consorzio", "avvalimento"],
        required=False,
    )
    company_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
        required=False,
    )
    ripartizione_requisiti = serializers.DictField(
        child=serializers.IntegerField(),
        required=False,
    )
    avvalimenti = serializers.ListField(
        child=serializers.DictField(),
        required=False,
    )


class TenderExportRequestSerializer(serializers.Serializer):
    items = serializers.ListField(
        child=serializers.ChoiceField(
            choices=[
                "scheda_gara",
                "matrice_requisiti",
                "report_partecipabilita",
                "relazione_tecnica",
                "offerta_economica",
            ]
        ),
        allow_empty=True,
        required=False,
    )
    format = serializers.ChoiceField(choices=["docx", "pdf", "xlsx"])
    bundle = serializers.BooleanField(default=False, required=False)
    matrix_company_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
        required=False,
    )
    participation = TenderExportParticipationSerializer(required=False)

    def validate(self, attrs):
        if not attrs.get("bundle") and not attrs.get("items"):
            raise serializers.ValidationError(
                "Specificare items oppure impostare bundle=true per il fascicolo completo."
            )
        return attrs
