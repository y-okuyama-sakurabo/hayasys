from rest_framework import serializers
from core.models import BusinessCommunication
from core.models import BusinessCommunicationAttachment
from core.serializers.customers import ShopTinySerializer, UserTinySerializer
from core.serializers.customers import CustomerSimpleSerializer

class BusinessCommunicationAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessCommunicationAttachment
        fields = ["id", "file", "mime", "bytes", "created_at"]

class BusinessCommunicationSerializer(serializers.ModelSerializer):
    sender_shop = ShopTinySerializer(read_only=True)
    receiver_shop = ShopTinySerializer(read_only=True)
    created_by = UserTinySerializer(read_only=True)
    customer = CustomerSimpleSerializer(read_only=True)  # ここは今のtinyに合わせてOK
    attachments = BusinessCommunicationAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = BusinessCommunication
        fields = [
            "id",
            "customer",
            "sender_shop",
            "receiver_shop",
            "created_by",
            "title",
            "content",
            "status",
            "created_at",
            "attachments",
        ]

class BusinessCommunicationWriteSerializer(serializers.ModelSerializer):
    # ✅ multipart の files を受け取る（複数可）
    files = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = BusinessCommunication
        fields = ["receiver_shop", "title", "content", "files"]


