from rest_framework import generics
from core.models import Order
from core.serializers.delivery_payment_list import DeliveryPaymentListSerializer


class DeliveryPaymentManagementListAPIView(generics.ListAPIView):
    serializer_class = DeliveryPaymentListSerializer

    def get_queryset(self):
        # 受注データのみに絞る
        return (
            Order.objects
            .filter(status="ordered")
            .prefetch_related(
                "items",
                "deliveries__items",
                "payment_management__records",
            )
            .order_by("-order_date")
        )
