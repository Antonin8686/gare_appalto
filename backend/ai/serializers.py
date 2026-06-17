from rest_framework import serializers

from .constants import AiActionType
from .models import AiGeneration


class AiGenerateRequestSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=AiActionType.CHOICES)
    tender_id = serializers.IntegerField(required=False, allow_null=True)
    company_id = serializers.IntegerField(required=False, allow_null=True)
    section_id = serializers.CharField(required=False, allow_blank=True, max_length=64)
    section_title = serializers.CharField(required=False, allow_blank=True, max_length=512)
    section_content = serializers.CharField(required=False, allow_blank=True)
    criterion_description = serializers.CharField(required=False, allow_blank=True)
    instructions = serializers.CharField(required=False, allow_blank=True, max_length=4000)
    rag_query = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class AiSourceSerializer(serializers.Serializer):
    source_type = serializers.CharField()
    source_id = serializers.IntegerField()
    title = serializers.CharField()
    url_path = serializers.CharField(required=False, allow_null=True)
    chunk_index = serializers.IntegerField(required=False)
    original_filename = serializers.CharField(required=False, allow_blank=True)


class AiGenerationResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    action_type = serializers.CharField()
    content = serializers.CharField()
    model = serializers.CharField()
    provider = serializers.CharField()
    prompt = serializers.CharField()
    sources = AiSourceSerializer(many=True)
    rag_chunks = serializers.ListField(child=serializers.DictField(), required=False)
    created_at = serializers.CharField()


class AiGenerationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiGeneration
        fields = (
            "id",
            "action_type",
            "model",
            "provider",
            "section_id",
            "sources",
            "created_at",
        )
        read_only_fields = fields


class AiConfigSerializer(serializers.Serializer):
    provider = serializers.CharField()
    model = serializers.CharField()
    configured = serializers.BooleanField()
