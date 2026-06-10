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
            )
            .exclude(status="cancelled")
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

        # =====================================================
        # 期間フィルタ（date_from / date_to）
        # =====================================================
        date_from = request.GET.get("date_from")
        date_to   = request.GET.get("date_to")
        if date_from:
            qs = qs.filter(order_date__gte=date_from)
        if date_to:
            qs = qs.filter(order_date__lte=date_to)

        # Order.delivery_status の値（not_delivered/partial/delivered）を
        # フロントエンドの表示値（pending/partial/completed）にマッピング
        DELIVERY_STATUS_MAP = {
            "not_delivered": "pending",
            "partial":       "partial",
            "delivered":     "completed",
        }

        results = []

        for order in qs:
            # --- 納品状況 ---
            # Order.delivery_status は Delivery.update_status() が常に正しく更新するので
            # そのまま使う（一覧側での再計算は不要・誤りの原因になる）
            delivery_status = DELIVERY_STATUS_MAP.get(
                order.delivery_status or "not_delivered", "pending"
            )

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

            if grand_total <= 0:
                # 受注金額が0円の場合は入金不要とみなす
                payment_status = "paid"
            elif paid_amount <= 0:
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