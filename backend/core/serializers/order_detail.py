# core/serializers/orders/order_detail.py
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType

from core.models import Order, Payment
from core.serializers.order_items import OrderItemSerializer
from core.serializers.order_vehicles import OrderVehicleSerializer
from core.serializers.payment import PaymentSerializer
from core.serializers.orders import CreatedBySerializer
from core.serializers.masters import ShopSerializer
from core.serializers.customers import CustomerDetailSerializer


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    vehicles = OrderVehicleSerializer(
        many=True, read_only=True, source="order_vehicles"
    )
    payments = serializers.SerializerMethodField()
    shop = ShopSerializer(read_only=True)
    created_by = CreatedBySerializer(read_only=True)
    customer = CustomerDetailSerializer(read_only=True)

    order_ct = ContentType.objects.get_for_model(Order)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_no",
            "shop",
            "status",
            "order_date",

            "party_name",
            "party_kana",
            "phone",
            "email",
            "postal_code",
            "address",

            "subtotal",
            "discount_total",
            "tax_total",
            "grand_total",

            "customer",
            "items",
            "vehicles",
            "payments",

            "created_by",
            "created_at",
            "updated_at",
        ]

    def get_payments(self, obj):
        qs = Payment.objects.filter(
            content_type=self.order_ct,
            object_id=obj.id,
        ).order_by("id")
        return PaymentSerializer(qs, many=True).data
