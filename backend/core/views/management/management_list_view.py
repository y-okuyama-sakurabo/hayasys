from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.db.models import Sum

from core.models import Order
from core.models.order_delivery_payment import PaymentManagement


class ManagementOrderListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Order.objects.select_related(
                "shop",
                "payment_management",
            )
            .prefetch_related(
                "payment_management__records",
                "deliveries__items",
            )
            .order_by("-order_date")
        )

        # =====================================================
        # 店舗フィルタ
        # =====================================================
        shop_id = request.GET.get("shop_id")
        if shop_id and shop_id != "all":
            qs = qs.filter(shop_id=shop_id)

        # =====================================================
        # 月フィルタ（例: 2026-04）
        # =====================================================
        month = request.GET.get("month")
        if month:
            try:
                year, m = month.split("-")
                qs = qs.filter(
                    order_date__year=int(year),
                    order_date__month=int(m),
                )
            except Exception:
                pass

        results = []

        for order in qs:
            # --- 納品状況 ---
            deliveries = order.deliveries.all()

            if not deliveries.exists():
                delivery_status = "pending"
            else:
                total_need = 0
                total_done = 0

                for delivery in deliveries:
                    for item in delivery.items.all():
                        total_need += item.quantity or 0
                        total_done += item.quantity or 0  # 必要なら実納品数の項目に変更

                if total_done >= total_need and total_need > 0:
                    delivery_status = "completed"
                elif total_done > 0:
                    delivery_status = "partial"
                else:
                    delivery_status = "pending"

            # --- 入金状況 ---
            try:
                pm = order.payment_management
                paid_amount = pm.records.aggregate(total=Sum("amount"))["total"] or 0
            except PaymentManagement.DoesNotExist:
                paid_amount = 0

            grand_total = order.grand_total or 0
            unpaid = grand_total - paid_amount
            if unpaid < 0:
                unpaid = 0

            if paid_amount == 0:
                payment_status = "pending"
            elif paid_amount < grand_total:
                payment_status = "partial"
            else:
                payment_status = "paid"

            results.append(
                {
                    "order_id": order.id,
                    "order_no": order.order_no,
                    "order_date": order.order_date,
                    "sales_date": order.sales_date,
                    "customer_name": order.party_name,
                    "delivery_status": delivery_status,
                    "payment_status": payment_status,
                    "grand_total": grand_total,
                    "paid_total": paid_amount,
                    "unpaid_total": unpaid,
                    "shop_id": order.shop_id,
                    "shop_name": order.shop.name if order.shop else None,
                }
            )

        return Response(results)