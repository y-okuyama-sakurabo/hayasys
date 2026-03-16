# core/serializers/business_communications.py

from rest_framework import serializers
from django.contrib.auth import get_user_model

from core.models import (
    BusinessCommunicationThread,
    BusinessCommunication,
    BusinessCommunicationAttachment,
)

from core.serializers.customers import (
    ShopTinySerializer,
    UserTinySerializer,
    CustomerSimpleSerializer,
)

from core.models import Shop


User = get_user_model()


# ==================================================
# Attachment
# ==================================================

class BusinessCommunicationAttachmentSerializer(serializers.ModelSerializer):

    class Meta:
        model = BusinessCommunicationAttachment
        fields = [
            "id",
            "file",
            "mime",
            "bytes",
            "created_at",
        ]


# ==================================================
# Message (READ)
# ==================================================

class BusinessCommunicationSerializer(serializers.ModelSerializer):

    sender_shop = ShopTinySerializer(read_only=True)
    sender_staff = UserTinySerializer(read_only=True)

    receiver_shop = ShopTinySerializer(read_only=True)
    receiver_staff = UserTinySerializer(read_only=True)

    created_by = UserTinySerializer(read_only=True)

    attachments = BusinessCommunicationAttachmentSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = BusinessCommunication
        fields = [
            "id",
            "thread",
            "customer",

            "sender_shop",
            "sender_staff",

            "receiver_shop",
            "receiver_staff",

            "created_by",
            "content",
            "status",
            "created_at",
            "attachments",
        ]


# ==================================================
# Message (WRITE)
# ==================================================

class BusinessCommunicationWriteSerializer(serializers.ModelSerializer):

    receiver_shop = serializers.PrimaryKeyRelatedField(
        queryset=Shop.objects.all(),
        required=False,
        allow_null=True,
    )

    receiver_staff = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )

    files = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = BusinessCommunication
        fields = [
            "receiver_shop",
            "receiver_staff",
            "content",
            "files",
        ]

    def create(self, validated_data):

        files = validated_data.pop("files", [])

        bc = BusinessCommunication.objects.create(**validated_data)

        for f in files:
            BusinessCommunicationAttachment.objects.create(
                communication=bc,
                file=f,
                mime=getattr(f, "content_type", "") or "",
                bytes=getattr(f, "size", 0) or 0,
            )

        return bc


# ==================================================
# Thread Serializer
# ==================================================

class BusinessCommunicationThreadSerializer(serializers.ModelSerializer):

    customer = CustomerSimpleSerializer(read_only=True)
    created_by = UserTinySerializer(read_only=True)

    messages = BusinessCommunicationSerializer(
        many=True,
        read_only=True
    )

    sender_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()

    class Meta:
        model = BusinessCommunicationThread
        fields = [
            "id",
            "customer",
            "title",
            "created_by",
            "created_at",
            "messages",
            "sender_name",
            "receiver_name",
        ]

    def get_sender_name(self, obj):

        first = obj.messages.first()

        if not first:
            return None

        if first.sender_staff:
            return first.sender_staff.display_name or first.sender_staff.login_id

        if first.sender_shop:
            return first.sender_shop.name

        return None


    def get_receiver_name(self, obj):

        first = obj.messages.first()

        if not first:
            return None

        if first.receiver_staff:
            return first.receiver_staff.display_name or first.receiver_staff.login_id

        if first.receiver_shop:
            return first.receiver_shop.name

        return None