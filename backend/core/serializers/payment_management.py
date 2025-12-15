from rest_framework import serializers
from core.models.order_delivery_payment import PaymentManagement, PaymentRecord
from core.models import Order


class PaymentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentRecord
        fields = [
            "id",
            "amount",
            "payment_date",
            "method",
            "memo",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class PaymentManagementSerializer(serializers.ModelSerializer):

    # records は read-only（入金追加は別API）
    records = PaymentRecordSerializer(many=True, read_only=True)

    # 計算フィールド
    total_paid = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()

    class Meta:
        model = PaymentManagement
        fields = [
            "id",
            "records",
            "updated_at",

            # 計算フィールド
            "total_paid",
            "balance",
        ]
        read_only_fields = ["id", "updated_at"]

    def get_total_paid(self, obj):
        return sum(r.amount for r in obj.records.all())

    def get_balance(self, obj):
        order = obj.order
        return max(order.grand_total - self.get_total_paid(obj), 0)

    # create は使わない（ビューで get_or_create する）
    def create(self, validated_data):
        raise NotImplementedError("PaymentManagement は API で直接 create しません")

    # update も基本使わない（入金追加は別API）
    def update(self, instance, validated_data):
        return instance
