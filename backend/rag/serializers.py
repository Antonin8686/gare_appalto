from rest_framework import serializers

from .models import RagChunk


class RagSearchRequestSerializer(serializers.Serializer):
    query = serializers.CharField(min_length=2, max_length=2000)
    limit = serializers.IntegerField(min_value=1, max_value=50, default=10, required=False)
    source_types = serializers.ListField(
        child=serializers.ChoiceField(choices=RagChunk.SourceType.choices),
        required=False,
        allow_empty=True,
    )


class RagContextualSearchRequestSerializer(RagSearchRequestSerializer):
    tender_id = serializers.IntegerField(required=False, allow_null=True)
    company_id = serializers.IntegerField(required=False, allow_null=True)


class RagSourceRefSerializer(serializers.Serializer):
    source_type = serializers.ChoiceField(choices=RagChunk.SourceType.choices)
    source_id = serializers.IntegerField(min_value=1)


class RagRetrieveSourcesRequestSerializer(serializers.Serializer):
    chunk_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
    )
    sources = RagSourceRefSerializer(many=True, required=False, allow_empty=True)

    def validate(self, attrs):
        if not attrs.get("chunk_ids") and not attrs.get("sources"):
            raise serializers.ValidationError(
                "Specificare chunk_ids oppure sources per recuperare le fonti."
            )
        return attrs


class RagReindexRequestSerializer(serializers.Serializer):
    scope = serializers.ChoiceField(
        choices=[
            ("all", "Tutto"),
            ("tender_documents", "Documenti gara"),
            ("technical_offers", "Offerte tecniche"),
            ("requirements", "Requisiti"),
            ("companies", "Aziende"),
        ],
        default="all",
    )
    async_task = serializers.BooleanField(default=False, required=False)


class RagDocumentSourceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    original_filename = serializers.CharField(required=False, allow_blank=True)
    url_path = serializers.CharField(required=False, allow_null=True)


class RagSourceSerializer(serializers.Serializer):
    source_type = serializers.CharField()
    source_id = serializers.IntegerField()
    title = serializers.CharField()
    url_path = serializers.CharField(required=False, allow_null=True)
    chunk_index = serializers.IntegerField(required=False)
    original_filename = serializers.CharField(required=False, allow_blank=True)


class RagSearchHitSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    source_type = serializers.CharField()
    source_type_label = serializers.CharField()
    source_id = serializers.IntegerField()
    chunk_index = serializers.IntegerField()
    title = serializers.CharField()
    excerpt = serializers.CharField()
    text = serializers.CharField()
    similarity = serializers.FloatField(allow_null=True)
    metadata = serializers.DictField()
    source = RagSourceSerializer()
    document = RagDocumentSourceSerializer(required=False, allow_null=True)
    indexed_at = serializers.CharField(required=False, allow_null=True)


class RagSearchResponseSerializer(serializers.Serializer):
    results = RagSearchHitSerializer(many=True)
    sources = RagSourceSerializer(many=True)
