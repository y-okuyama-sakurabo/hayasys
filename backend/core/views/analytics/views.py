# views/analytics/views.py

from datetime import datetime, timedelta, date

from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from core.models import Order, Estimate
from core.serializers.orders import OrderSerializer
from core.serializers.estimates import EstimateSerializer


# ==================================================
# 日別グラフ用API
# ==================================================
class SalesDailyAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_str = request.query_params.get("start")
        end_str = request.query_params.get("end")
        shop_id = request.query_params.get("shop_id")
        staff_id = request.query_params.get("staff_id")

        today = date.today()

        try:
            start = datetime.strptime(start_str, "%Y-%m-%d").date() if start_str else today.replace(day=1)
            end = datetime.strptime(end_str, "%Y-%m-%d").date() if end_str else today
        except Exception:
            raise ValidationError("日付形式は YYYY-MM-DD で指定してください")

        # -----------------------------
        # filter作成
        # -----------------------------
        estimate_filter = {
            "estimate_date__range": [start, end],
        }

        order_filter = {
            "order_date__range": [start, end],
        }

        # 店舗フィルタ
        if shop_id and shop_id != "all":
            estimate_filter["shop_id"] = shop_id
            order_filter["shop_id"] = shop_id
        else:
            estimate_filter["shop"] = request.user.shop
            order_filter["shop"] = request.user.shop
        
        if staff_id and staff_id != "all":
            estimate_filter["created_by_id"] = staff_id
            order_filter["created_by_id"] = staff_id

        # -----------------------------
        # DB取得
        # -----------------------------
        estimate_qs = (
            Estimate.objects
            .filter(**estimate_filter)
            .values("estimate_date")
            .annotate(total=Sum("grand_total"))
        )

        order_qs = (
            Order.objects
            .filter(**order_filter)
            .values("order_date")
            .annotate(total=Sum("grand_total"))
        )

        # -----------------------------
        # dict化
        # -----------------------------
        estimate_map = {x["estimate_date"]: x["total"] for x in estimate_qs}
        order_map = {x["order_date"]: x["total"] for x in order_qs}

        result = []
        current = start

        while current <= end:
            result.append({
                "date": current,
                "estimate": float(estimate_map.get(current, 0) or 0),
                "order": float(order_map.get(current, 0) or 0),
            })
            current += timedelta(days=1)

        return Response(result)


# ==================================================
# 日別明細一覧API
# ==================================================
class SalesListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get("date")
        start_str = request.query_params.get("start")
        end_str = request.query_params.get("end")
        shop_id = request.query_params.get("shop_id")
        staff_id = request.query_params.get("staff_id")

        # -----------------------------
        # 日付指定
        # -----------------------------
        if date_str:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()

            estimates = Estimate.objects.filter(
                estimate_date=target_date
            )
            orders = Order.objects.filter(
                order_date=target_date
            )

        # -----------------------------
        # 期間指定
        # -----------------------------
        elif start_str and end_str:
            start = datetime.strptime(start_str, "%Y-%m-%d").date()
            end = datetime.strptime(end_str, "%Y-%m-%d").date()

            estimates = Estimate.objects.filter(
                estimate_date__range=[start, end]
            )
            orders = Order.objects.filter(
                order_date__range=[start, end]
            )

        else:
            raise ValidationError("date または start/end を指定してください")

        # -----------------------------
        # 店舗フィルタ
        # -----------------------------
        if shop_id and shop_id != "all":
            estimates = estimates.filter(shop_id=shop_id)
            orders = orders.filter(shop_id=shop_id)
        else:
            estimates = estimates.filter(shop=request.user.shop)
            orders = orders.filter(shop=request.user.shop)

        if staff_id and staff_id != "all":
            estimates = estimates.filter(created_by_id=staff_id)
            orders = orders.filter(created_by_id=staff_id)

        return Response({
            "estimates": EstimateSerializer(estimates, many=True).data,
            "orders": OrderSerializer(orders, many=True).data,
        })

        