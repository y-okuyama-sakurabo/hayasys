from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.models import Order
from core.models.order_delivery_payment import Delivery, PaymentManagement
from django.db.models import Sum


class ManagementOrderListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Order.objects.all().order_by("-order_date")

        # =====================================================
        # ★ 店舗フィルタリングを追加
        # =====================================================
        shop_id = request.GET.get("shop_id")
        if shop_id and shop_id != "all":
            qs = qs.filter(shop_id=shop_id)

        results = []

        for order in qs:

            # --- 納品状況 ---
            deliveries = Delivery.objects.filter(order=order)
            if not deliveries.exists():
                delivery_status = "pending"
            else:
                total_need = 0
                total_done = 0

                for d in deliveries:
                    for item in d.items.all():
                        total_need += item.quantity
                        total_done += item.quantity  # TODO: 必要なら正確な納品数に変更

                delivery_status = (
                    "completed" if total_done >= total_need and total_need > 0
                    else "partial" if total_done > 0
                    else "pending"
                )

            # --- 入金状況 ---
            try:
                pm = order.payment_management
                paid_amount = pm.records.aggregate(total=Sum("amount"))["total"] or 0
            except PaymentManagement.DoesNotExist:
                paid_amount = 0

            unpaid = order.grand_total - paid_amount

            if paid_amount == 0:
                payment_status = "pending"
            elif paid_amount < order.grand_total:
                payment_status = "partial"
            else:
                payment_status = "paid"

            results.append({
                "order_id": order.id,
                "order_no": order.order_no,
                "order_date": order.order_date,
                "sales_date": order.sales_date,
                "customer_name": order.party_name,

                "delivery_status": delivery_status,
                "payment_status": payment_status,

                "grand_total": order.grand_total,
                "paid_total": paid_amount,
                "unpaid_total": unpaid,

                # ★ 追加：フロントで使えるように店舗情報
                "shop_id": order.shop_id,
                "shop_name": order.shop.name if order.shop else None,
            })

        return Response(results)
