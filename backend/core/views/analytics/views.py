#views/analytics/views.py

from datetime import date, datetime
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from django.utils.timezone import make_aware
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.models import Order, OrderItem, Estimate


# ==================================================
# 共通ヘルパ
# ==================================================
def parse_date(value, default=None):
    if not value:
        return default
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return default


# ==================================================
# 📊 売上サマリー（カード表示用）
# ==================================================
class SalesSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Order.objects.all()

        shop_id = request.query_params.get("shop_id")
        if shop_id:
            qs = qs.filter(shop_id=shop_id)

        data = qs.aggregate(
            order_count=Count("id"),
            subtotal=Sum("subtotal"),
            tax_total=Sum("tax_total"),
            grand_total=Sum("grand_total"),
        )

        return Response({
            "order_count": data["order_count"] or 0,
            "subtotal": data["subtotal"] or 0,
            "tax_total": data["tax_total"] or 0,
            "grand_total": data["grand_total"] or 0,
        })


# ==================================================
# 📈 日別売上推移
# ==================================================
class SalesDailyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from_date = parse_date(request.query_params.get("from"))
        to_date = parse_date(request.query_params.get("to"))
        shop_id = request.query_params.get("shop_id")

        qs = Order.objects.all()

        if shop_id:
            qs = qs.filter(shop_id=shop_id)
        if from_date:
            qs = qs.filter(order_date__gte=from_date)
        if to_date:
            qs = qs.filter(order_date__lte=to_date)

        daily = (
            qs
            .annotate(day=TruncDate("order_date"))
            .values("day")
            .annotate(
                sales_count=Count("id"),
                subtotal=Sum("subtotal"),
                tax_total=Sum("tax_total"),
                grand_total=Sum("grand_total"),
            )
            .order_by("day")
        )

        return Response({
            "range": {
                "from": from_date,
                "to": to_date,
            },
            "items": [
                {
                    "date": d["day"],
                    "sales_count": d["sales_count"],
                    "subtotal": d["subtotal"] or 0,
                    "tax_total": d["tax_total"] or 0,
                    "grand_total": d["grand_total"] or 0,
                }
                for d in daily
            ],
        })


# ==================================================
# 🧑‍💼 担当者別売上
# ==================================================
class SalesByStaffAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop_id = request.query_params.get("shop_id")

        qs = OrderItem.objects.select_related("staff")

        if shop_id:
            qs = qs.filter(order__shop_id=shop_id)

        data = (
            qs
            .values(
                "staff_id",
                "staff__display_name",
                "staff__first_name",
                "staff__last_name",
                "staff__login_id",
            )
            .annotate(
                sales_count=Count("id"),
                subtotal=Sum("subtotal"),
            )
            .order_by("-subtotal")
        )

        items = []
        for d in data:
            # 表示名決定ロジック
            staff_name = (
                d["staff__display_name"]
                or f'{d["staff__last_name"] or ""} {d["staff__first_name"] or ""}'.strip()
                or d["staff__login_id"]
                or "未設定"
            )

            items.append({
                "staff_id": d["staff_id"],
                "staff_name": staff_name,
                "sales_count": d["sales_count"],
                "subtotal": d["subtotal"] or 0,
            })

        return Response({ "items": items })


# ==================================================
# 📦 カテゴリ別売上（最上位カテゴリ）
# ==================================================
class SalesByCategoryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop_id = request.query_params.get("shop_id")

        qs = OrderItem.objects.select_related("category")

        if shop_id:
            qs = qs.filter(order__shop_id=shop_id)

        # 一旦シンプルに「category 単位」
        data = (
            qs
            .values("category_id", "category__name")
            .annotate(
                subtotal=Sum("subtotal"),
            )
            .order_by("-subtotal")
        )

        total = sum(d["subtotal"] or 0 for d in data)

        return Response({
            "items": [
                {
                    "category_id": d["category_id"],
                    "category_name": d["category__name"],
                    "subtotal": d["subtotal"] or 0,
                    "ratio": round((d["subtotal"] / total * 100), 1) if total else 0,
                }
                for d in data
            ]
        })


# ==================================================
# 🎯 見積 → 受注 成約率
# ==================================================
class EstimateConversionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop_id = request.query_params.get("shop_id")

        qs = Estimate.objects.all()

        if shop_id:
            qs = qs.filter(shop_id=shop_id)

        total = qs.count()
        ordered = qs.filter(status="ordered").count()

        rate = round((ordered / total * 100), 1) if total else 0

        return Response({
            "total_estimates": total,
            "ordered_estimates": ordered,
            "conversion_rate": rate,
        })
    
# ==================================================
# 🧑‍💼 受注作成者別売上（営業成績）
# ==================================================
class OrdersByCreatorAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop_id = request.query_params.get("shop_id")
        from_date = parse_date(request.query_params.get("from"))
        to_date = parse_date(request.query_params.get("to"))

        qs = Order.objects.select_related("created_by")

        qs = qs.filter(
            created_by__isnull=False,
            order_date__isnull=False,
        )

        if shop_id:
            qs = qs.filter(shop_id=shop_id)

        if from_date:
            qs = qs.filter(order_date__gte=from_date)
        if to_date:
            qs = qs.filter(order_date__lte=to_date)

        data = (
            qs
            .values(
                "created_by_id",
                "created_by__display_name",
                "created_by__first_name",
                "created_by__last_name",
                "created_by__login_id",
            )
            .annotate(
                order_count=Count("id"),
                subtotal=Sum("subtotal"),
            )
            .order_by("-subtotal")
        )

        items = []
        for d in data:
            staff_name = (
                d["created_by__display_name"]
                or f'{d["created_by__last_name"] or ""} {d["created_by__first_name"] or ""}'.strip()
                or d["created_by__login_id"]
                or "未設定"
            )

            subtotal = d["subtotal"] or 0

            items.append({
                "staff_id": d["created_by_id"],
                "staff_name": staff_name,
                "order_count": d["order_count"],
                "subtotal": subtotal,
                "average_sales": int(subtotal / d["order_count"]) if d["order_count"] else 0,
            })

        return Response({"items": items})

