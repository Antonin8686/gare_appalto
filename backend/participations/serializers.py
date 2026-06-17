from decimal import Decimal

from rest_framework import serializers

from companies.models import Company

from .models import Consorzio, ImpresaAusiliaria, RTI, RTIMember


class RTIMemberSerializer(serializers.ModelSerializer):
    company_id = serializers.PrimaryKeyRelatedField(
        source="company",
        queryset=Company.objects.all(),
    )
    company_name = serializers.CharField(source="company.name", read_only=True)
    ruolo_label = serializers.CharField(source="get_ruolo_display", read_only=True)

    class Meta:
        model = RTIMember
        fields = (
            "id",
            "company_id",
            "company_name",
            "ruolo",
            "ruolo_label",
            "quota_partecipazione",
            "quota_esecuzione",
        )
        read_only_fields = ("id", "company_name", "ruolo_label")


class RTISerializer(serializers.ModelSerializer):
    mandataria_id = serializers.PrimaryKeyRelatedField(
        source="mandataria",
        queryset=Company.objects.all(),
    )
    mandataria_name = serializers.CharField(source="mandataria.name", read_only=True)
    members = RTIMemberSerializer(many=True, required=False)

    class Meta:
        model = RTI
        fields = (
            "id",
            "tender",
            "mandataria_id",
            "mandataria_name",
            "nome",
            "note",
            "ripartizione_requisiti",
            "members",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "tender", "mandataria_name", "created_at", "updated_at")

    def _validate_company_org(self, company: Company) -> Company:
        organization = self.context.get("organization")
        if organization and company.organization_id != organization.id:
            raise serializers.ValidationError("Azienda non appartenente all'organizzazione.")
        return company

    def validate_mandataria_id(self, company: Company) -> Company:
        return self._validate_company_org(company)

    def validate_members(self, members):
        organization = self.context.get("organization")
        for member in members:
            company = member.get("company")
            if organization and company and company.organization_id != organization.id:
                raise serializers.ValidationError(
                    "Tutte le imprese devono appartenere all'organizzazione."
                )
        return members

    def create(self, validated_data):
        members_data = validated_data.pop("members", [])
        rti = RTI.objects.create(**validated_data)
        self._sync_members(rti, members_data)
        return rti

    def update(self, instance, validated_data):
        members_data = validated_data.pop("members", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if members_data is not None:
            instance.members.all().delete()
            self._sync_members(instance, members_data)
        return instance

    def _sync_members(self, rti: RTI, members_data: list[dict]) -> None:
        seen_companies: set[int] = set()
        for item in members_data:
            company = item["company"]
            if company.id in seen_companies:
                continue
            seen_companies.add(company.id)
            RTIMember.objects.create(
                rti=rti,
                company=company,
                ruolo=item.get("ruolo", RTIMember.Ruolo.MANDANTE),
                quota_partecipazione=item.get("quota_partecipazione", Decimal("0")),
                quota_esecuzione=item.get("quota_esecuzione", Decimal("0")),
            )

        if rti.mandataria_id not in seen_companies:
            RTIMember.objects.create(
                rti=rti,
                company=rti.mandataria,
                ruolo=RTIMember.Ruolo.MANDATARIA,
                quota_partecipazione=Decimal("0"),
                quota_esecuzione=Decimal("0"),
            )


class ConsorzioSerializer(serializers.ModelSerializer):
    mandataria_id = serializers.PrimaryKeyRelatedField(
        source="mandataria",
        queryset=Company.objects.all(),
    )
    mandataria_name = serializers.CharField(source="mandataria.name", read_only=True)

    class Meta:
        model = Consorzio
        fields = (
            "id",
            "tender",
            "mandataria_id",
            "mandataria_name",
            "nome",
            "note",
            "mandanti",
            "ripartizione_requisiti",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "tender", "mandataria_name", "created_at", "updated_at")

    def validate_mandataria_id(self, company: Company) -> Company:
        organization = self.context.get("organization")
        if organization and company.organization_id != organization.id:
            raise serializers.ValidationError("Azienda non appartenente all'organizzazione.")
        return company


class ImpresaAusiliariaSerializer(serializers.ModelSerializer):
    impresa_principale_id = serializers.PrimaryKeyRelatedField(
        source="impresa_principale",
        queryset=Company.objects.all(),
    )
    impresa_ausiliaria_id = serializers.PrimaryKeyRelatedField(
        source="impresa_ausiliaria",
        queryset=Company.objects.all(),
    )
    impresa_principale_name = serializers.CharField(
        source="impresa_principale.name",
        read_only=True,
    )
    impresa_ausiliaria_name = serializers.CharField(
        source="impresa_ausiliaria.name",
        read_only=True,
    )

    class Meta:
        model = ImpresaAusiliaria
        fields = (
            "id",
            "tender",
            "impresa_principale_id",
            "impresa_principale_name",
            "impresa_ausiliaria_id",
            "impresa_ausiliaria_name",
            "requisiti_coperti",
            "note",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "tender",
            "impresa_principale_name",
            "impresa_ausiliaria_name",
            "created_at",
            "updated_at",
        )


class ParticipationAnalyzeSerializer(serializers.Serializer):
    forma = serializers.ChoiceField(
        choices=["singola", "rti", "consorzio", "avvalimento"],
        default="singola",
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


class ParticipationSuggestionSerializer(serializers.Serializer):
    forma = serializers.CharField()
    forma_label = serializers.CharField()
    motivazione = serializers.CharField()
    confidenza = serializers.CharField()
    company_ids = serializers.ListField(child=serializers.IntegerField())
    mandataria_id = serializers.IntegerField(allow_null=True)
    mandanti_ids = serializers.ListField(child=serializers.IntegerField())


class CoverageSummarySerializer(serializers.Serializer):
    totale = serializers.IntegerField()
    soddisfatti = serializers.IntegerField()
    parziali = serializers.IntegerField()
    non_soddisfatti = serializers.IntegerField()
    percentuale = serializers.FloatField()


class RequirementCoverageSerializer(serializers.Serializer):
    requirement_id = serializers.IntegerField()
    descrizione = serializers.CharField()
    tipo = serializers.CharField()
    categoria = serializers.CharField()
    esito = serializers.CharField()
    esito_label = serializers.CharField()
    semaforo = serializers.CharField()
    company_id = serializers.IntegerField(allow_null=True)
    company_name = serializers.CharField(allow_null=True)
    valore_posseduto = serializers.CharField()
    valore_richiesto = serializers.CharField()
    motivazione = serializers.CharField()
    critico = serializers.BooleanField()


class ParticipationAnalysisResponseSerializer(serializers.Serializer):
    suggerimento = ParticipationSuggestionSerializer(required=False)
    analisi = serializers.DictField()
