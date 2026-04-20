from collections import defaultdict
from decimal import Decimal

from django.db.models import Prefetch
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.models import Order, Delivery, DeliveryItem
from core.serializers.management_detail import ManagementDetailSerializer
from core.serializers.management_detail import ManagementMonthlySummarySerializer




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

class ManagementMonthlySummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Order.objects.select_related(
            "payment_management"
        ).prefetch_related(
            "payment_management__records"
        )

        # -----------------------------
        # 店舗フィルタ
        # -----------------------------
        shop_id = request.GET.get("shop_id")
        if shop_id and shop_id != "all":
            qs = qs.filter(shop_id=shop_id)

        result = defaultdict(lambda: {
            "total_amount": Decimal("0"),
            "paid_amount": Decimal("0"),
            "unpaid_amount": Decimal("0"),
        })

        # -----------------------------
        # 月ごと集計
        # -----------------------------
        for order in qs:
            if not order.order_date:
                continue  # 念のため

            month = order.order_date.replace(day=1)

            pm = getattr(order, "payment_management", None)

            paid = Decimal("0")
            if pm:
                for p in pm.records.all():
                    paid += p.amount or Decimal("0")

            total = order.grand_total or Decimal("0")
            unpaid = total - paid if total > paid else Decimal("0")

            result[month]["total_amount"] += total
            result[month]["paid_amount"] += paid
            result[month]["unpaid_amount"] += unpaid

        # -----------------------------
        # 整形
        # -----------------------------
        response = [
            {
                "month": month.strftime("%Y-%m"),
                **vals
            }
            for month, vals in result.items()
        ]

        sorted_data = sorted(
            response,
            key=lambda x: x["month"],
            reverse=True
        )

        serializer = ManagementMonthlySummarySerializer(sorted_data, many=True)
        return Response(serializer.data)