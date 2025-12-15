from rest_framework import generics
from django.utils.timezone import now

from core.models import Order
from core.models.sales import Sales
from core.serializers.sales import SalesSerializer


class SalesListCreateAPIView(generics.ListCreateAPIView):
    queryset = Sales.objects.select_related("order")
    serializer_class = SalesSerializer

    # 手動計上 → sales_amount は Order の金額を入れる
    def perform_create(self, serializer):
        order = serializer.validated_data["order"]
        serializer.save(
            sales_amount=order.grand_total,
            sales_type="manual"
        )


class SalesRetrieveAPIView(generics.RetrieveAPIView):
    queryset = Sales.objects.select_related("order")
    serializer_class = SalesSerializer
