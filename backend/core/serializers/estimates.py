from rest_framework import serializers
from core.models import Estimate, EstimateParty

class EstimatePartySerializer(serializers.ModelSerializer):
  class Meta:
    model = EstimateParty
    fields = "__all__"

class EstimateSerializer(serializers.ModelSerializer):
  party = EstimatePartySerializer(read_only=True)
  party_id = serializers.PrimaryKeyRelatedField(
    queryset=EstimateParty.objects.all(), source="party", write_only=True
  )

  class Meta:
    model = Estimate
    fields = [
      "id",
      "estimate_no",
      "shop",
      "status",
      "estimate_date",
      "party",
      "party_id",
      "subtotal",
      "discount_total",
      "tax_total",
      "grand_total",
      "created_by",
      "created_at",
      "updated_at",
    ]
    read_only_fields = ["created_by", "created_at", "updated_at"]