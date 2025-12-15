from django.db.models import Prefetch
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.models import Order, Delivery, DeliveryItem
from core.serializers.management_detail import ManagementDetailSerializer


class ManagementOrderDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = (
            Order.objects
            .prefetch_related(
                "items",  # 受注明細

                Prefetch(
                    "deliveries",
                    queryset=Delivery.objects.prefetch_related(
                        Prefetch(
                            "items",
                            queryset=DeliveryItem.objects.select_related("order_item")
                        )
                    )
                )
            )
            .get(id=order_id)
        )

        serializer = ManagementDetailSerializer(order)
        return Response(serializer.data)
