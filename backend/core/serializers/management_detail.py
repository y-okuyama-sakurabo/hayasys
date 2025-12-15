from rest_framework import serializers
from core.models import Order, OrderItem
from core.models.order_delivery_payment import Delivery, DeliveryItem, PaymentManagement, PaymentRecord


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "name",
            "quantity",
            "unit_price",
            "delivery_status",
            "delivery_date",
        ]


class DeliveryItemSerializer(serializers.ModelSerializer):
    order_item = serializers.IntegerField(source="order_item.id", read_only=True)
    order_item_name = serializers.CharField(source="order_item.name", read_only=True)

    class Meta:
        model = DeliveryItem
        fields = ["id", "order_item", "order_item_name", "quantity"]


class PaymentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentRecord
        fields = ["id", "amount", "payment_date", "method", "memo"]


class ManagementDeliverySerializer(serializers.ModelSerializer):
    items = DeliveryItemSerializer(many=True)

    class Meta:
        model = Delivery
        fields = ["id", "delivery_date", "delivery_status", "items"]


class ManagementDetailSerializer(serializers.ModelSerializer):
    delivery_status = serializers.CharField()
    final_delivery_date = serializers.DateField(allow_null=True)
    final_payment_date = serializers.DateField(read_only=True)

    paid_total = serializers.SerializerMethodField()
    unpaid_total = serializers.SerializerMethodField()

    sales_date = serializers.SerializerMethodField()

    items = OrderItemSerializer(many=True)
    deliveries = ManagementDeliverySerializer(many=True)
    payments = PaymentRecordSerializer(
        source="payment_management.records",
        many=True,
        required=False,
    )
    customer_name = serializers.CharField(source="party_name")

    class Meta:
        model = Order
        fields = [
            "id",
            "order_no",
            "order_date",
            "sales_date",
            "customer_name",
            "items",
            "deliveries",
            "payments",
            "grand_total",
            "paid_total",
            "unpaid_total",
            "delivery_status",
            "final_delivery_date",
            "final_payment_date"
        ]

    # ----------------------------
    # 売上日
    # ----------------------------
    def get_sales_date(self, obj):
        return getattr(obj, "sales_date", None)

    # ----------------------------
    # 入金済合計
    # ----------------------------
    def get_paid_total(self, obj):
        if not hasattr(obj, "payment_management") or obj.payment_management is None:
            return 0

        return sum([p.amount for p in obj.payment_management.records.all()])

    # ----------------------------
    # 残額
    # ----------------------------
    def get_unpaid_total(self, obj):
        paid = self.get_paid_total(obj)
        return max(obj.grand_total - paid, 0)
