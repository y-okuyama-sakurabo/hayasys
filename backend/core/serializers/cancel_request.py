from rest_framework import serializers
from core.models.cancel_request import CancelRequest


class CancelRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.SerializerMethodField()
    reviewed_by_name  = serializers.SerializerMethodField()
    order_no          = serializers.CharField(source="order.order_no", read_only=True)
    customer_name     = serializers.CharField(source="order.party_name", read_only=True)
    status_display    = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = CancelRequest
        fields = [
            "id", "order", "order_no", "customer_name",
            "reason", "status", "status_display",
            "requested_by", "requested_by_name",
            "reviewed_by",  "reviewed_by_name", "reviewed_at",
            "created_at",
        ]
        read_only_fields = [
            "id", "status", "requested_by", "reviewed_by", "reviewed_at", "created_at",
        ]

    def get_requested_by_name(self, obj):
        u = obj.requested_by
        return u.display_name or u.login_id if u else None

    def get_reviewed_by_name(self, obj):
        u = obj.reviewed_by
        return u.display_name or u.login_id if u else None
