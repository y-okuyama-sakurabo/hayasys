from rest_framework import serializers
from core.models import BusinessCommunication
from core.serializers.customers import ShopTinySerializer, UserTinySerializer

class BusinessCommunicationSerializer(serializers.ModelSerializer):
  sender_shop = ShopTinySerializer(read_only=True)
  receiver_shop = ShopTinySerializer(read_only=True)
  staff = UserTinySerializer(read_only=True)

  class Meta:
    model = BusinessCommunication
    fields = [
      "id",
      "customer",
      "sender_shop",
      "receiver_shop",
      "staff",
      "title",
      "content",
      "status",
      "created_at",
      "updated_at",
    ]

class BusinessCommunicationWriteSerializer(serializers.ModelSerializer):
  class Meta:
    model = BusinessCommunication
    fields = [
      "customer",
      "receiver_shop",
      "title",
      "content"
    ]