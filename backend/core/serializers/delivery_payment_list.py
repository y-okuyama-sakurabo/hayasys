from rest_framework import serializers
from core.models import Order
from core.models.order_delivery_payment import (
    Delivery,
    DeliveryItem,
    PaymentManagement,
    PaymentRecord
)


class DeliveryPaymentListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="party_name", read_only=True)

    delivery_status = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()

    order_amount = serializers.DecimalField(
        source="grand_total",
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    paid_amount = serializers.SerializerMethodField()
    unpaid_amount = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_no",
            "order_date",
            "customer_name",

            "delivery_status",
            "payment_status",

            "order_amount",
            "paid_amount",
            "unpaid_amount",
        ]

    # -----------------------------
    # 納品ステータス
    # -----------------------------
    def get_delivery_status(self, obj):
        deliveries = obj.deliveries.all()

        if not deliveries:
            return "未納品"

        # 全部の items の数量合計
        total_order_qty = 0
        total_delivered_qty = 0

        for order_item in obj.items.all():
            total_order_qty += float(order_item.quantity)

        for d in deliveries:
            for di in d.items.all():
                total_delivered_qty += float(di.quantity)

        if total_delivered_qty == 0:
            return "未納品"

        if total_delivered_qty < total_order_qty:
            return "一部納品"

        return "納品完了"

    # -----------------------------
    # 入金ステータス
    # -----------------------------
    def get_payment_status(self, obj):
        pm = getattr(obj, "payment_management", None)
        if not pm:
            return "未入金"

        total_paid = sum(r.amount for r in pm.records.all())
        order_amount = obj.grand_total or 0

        if total_paid == 0:
            return "未入金"

        if total_paid < order_amount:
            return "一部入金"

        return "入金完了"

    # -----------------------------
    # 入金済み額
    # -----------------------------
    def get_paid_amount(self, obj):
        pm = getattr(obj, "payment_management", None)
        if not pm:
            return 0
        return sum(r.amount for r in pm.records.all())

    # -----------------------------
    # 未入金額
    # -----------------------------
    def get_unpaid_amount(self, obj):
        order_amount = obj.grand_total or 0
        paid = self.get_paid_amount(obj)
        return order_amount - paid
