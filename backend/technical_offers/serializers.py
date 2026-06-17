from decimal import Decimal

from rest_framework import serializers

from .models import TechnicalOffer


class TechnicalOfferSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True,
    )
    settore_display = serializers.CharField(
        source="get_settore_display",
        read_only=True,
    )

    class Meta:
        model = TechnicalOffer
        fields = (
            "id",
            "title",
            "category",
            "category_display",
            "settore",
            "settore_display",
            "tipologia_servizio",
            "ente_appaltante",
            "valore_appalto",
            "durata",
            "anno",
            "punteggio_ottenuto",
            "content",
            "tags",
            "parole_chiave",
            "riutilizzabilita",
            "innovativita",
            "rag_text",
            "rag_metadata",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "category_display",
            "settore_display",
            "rag_text",
            "rag_metadata",
            "created_at",
            "updated_at",
        )

    def validate_title(self, value):
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Il titolo è obbligatorio.")
        return stripped

    def validate_content(self, value):
        return value.strip()

    def _validate_string_list(self, value, field_name: str) -> list[str]:
        if not isinstance(value, list):
            raise serializers.ValidationError(f"{field_name} deve essere una lista.")
        cleaned = []
        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError(
                    f"Ogni elemento di {field_name} deve essere una stringa."
                )
            stripped = item.strip()
            if stripped:
                cleaned.append(stripped)
        return cleaned

    def validate_tags(self, value):
        return self._validate_string_list(value, "tags")

    def validate_parole_chiave(self, value):
        return self._validate_string_list(value, "parole_chiave")

    def validate_valore_appalto(self, value: Decimal | None) -> Decimal | None:
        if value is not None and value < 0:
            raise serializers.ValidationError("Il valore appalto non può essere negativo.")
        return value

    def validate_punteggio_ottenuto(self, value: Decimal | None) -> Decimal | None:
        if value is not None and value < 0:
            raise serializers.ValidationError("Il punteggio non può essere negativo.")
        return value


class TechnicalOfferFacetSerializer(serializers.Serializer):
    category = serializers.DictField(child=serializers.IntegerField())
    settore = serializers.DictField(child=serializers.IntegerField())
    anni = serializers.DictField(child=serializers.IntegerField())
