from rest_framework import serializers
from core.models.document_templates import DocumentTemplate, DocumentField


class DocumentFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentField
        fields = [
            "id", "label", "source_key", "static_value", "input_label",
            "x", "y", "font_size", "letter_spacing", "order",
        ]


class DocumentTemplateSerializer(serializers.ModelSerializer):
    fields = DocumentFieldSerializer(many=True, read_only=True)

    class Meta:
        model = DocumentTemplate
        fields = [
            "id", "name", "description",
            "paper_width", "paper_height",
            "is_active", "fields",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
