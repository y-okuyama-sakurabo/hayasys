# views/analytics/views.py

from datetime import datetime, timedelta, date

from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from core.models import Order, Estimate, EstimateItem
from core.serializers.orders import OrderSerializer
from core.serializers.estimates import EstimateSerializer
from core.models import OrderItem, EstimateItem
from core.models.order_vehicle import OrderVehicle
from core.models.estimate_vehicle import EstimateVehicle

# -----------------------------
# カテゴリパス生成関数 ★追加
# -----------------------------
def build_category_path(cat):
    path = []

    current = cat
    while current:
        path.insert(0, {
            "id": current.id,
            "name": current.name,
        })
        current = current.parent

    return path


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
        order_map    = {x["order_date"]:    x["total"] for x in order_qs}

        # 売上集計（sales_date 基準）
        sales_filter: dict = {"sales_date__range": [start, end]}
        if shop_id and shop_id != "all":
            sales_filter["shop_id"] = shop_id
        else:
            sales_filter["shop"] = request.user.shop
        if staff_id and staff_id != "all":
            sales_filter["created_by_id"] = staff_id

        sales_qs = (
            Order.objects
            .filter(**sales_filter)
            .exclude(sales_date__isnull=True)
            .values("sales_date")
            .annotate(total=Sum("grand_total"))
        )
        sales_map = {x["sales_date"]: x["total"] for x in sales_qs}

        result = []
        current = start

        while current <= end:
            result.append({
                "date":     current,
                "estimate": float(estimate_map.get(current, 0) or 0),
                "order":    float(order_map.get(current, 0) or 0),
                "sales":    float(sales_map.get(current, 0) or 0),
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
            estimates = Estimate.objects.filter(estimate_date=target_date)
            orders    = Order.objects.filter(order_date=target_date)
            sales     = Order.objects.filter(sales_date=target_date)

        # -----------------------------
        # 期間指定
        # -----------------------------
        elif start_str and end_str:
            start = datetime.strptime(start_str, "%Y-%m-%d").date()
            end   = datetime.strptime(end_str,   "%Y-%m-%d").date()
            estimates = Estimate.objects.filter(estimate_date__range=[start, end])
            orders    = Order.objects.filter(order_date__range=[start, end])
            sales     = Order.objects.filter(sales_date__range=[start, end])

        else:
            raise ValidationError("date または start/end を指定してください")

        # -----------------------------
        # 店舗フィルタ
        # -----------------------------
        if shop_id and shop_id != "all":
            estimates = estimates.filter(shop_id=shop_id)
            orders    = orders.filter(shop_id=shop_id)
            sales     = sales.filter(shop_id=shop_id)
        else:
            estimates = estimates.filter(shop=request.user.shop)
            orders    = orders.filter(shop=request.user.shop)
            sales     = sales.filter(shop=request.user.shop)

        if staff_id and staff_id != "all":
            estimates = estimates.filter(created_by_id=staff_id)
            orders    = orders.filter(created_by_id=staff_id)
            sales     = sales.filter(created_by_id=staff_id)

        return Response({
            "estimates": EstimateSerializer(estimates, many=True).data,
            "orders":    OrderSerializer(orders,    many=True).data,
            "sales":     OrderSerializer(sales,     many=True).data,
        })

class ProductAnalyticsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # -----------------------------
        # パラメータ
        # -----------------------------
        mode = request.query_params.get("mode", "order")
        type_ = request.query_params.get("type", "category")
        level = request.query_params.get("level", "L3")

        start_str = request.query_params.get("start")
        end_str = request.query_params.get("end")
        shop_id = request.query_params.get("shop_id")
        staff_id = request.query_params.get("staff_id")

        today = date.today()

        try:
            start = datetime.strptime(start_str, "%Y-%m-%d").date() if start_str else today.replace(day=1)
            end = datetime.strptime(end_str, "%Y-%m-%d").date() if end_str else today
        except:
            raise ValidationError("日付形式は YYYY-MM-DD")

        # -----------------------------
        # queryset選択
        # -----------------------------
        if mode == "order":
            qs = OrderItem.objects.select_related("category", "manufacturer")
            date_filter = {"order__order_date__range": [start, end]}
        else:
            qs = EstimateItem.objects.select_related("category", "manufacturer")
            date_filter = {"estimate__estimate_date__range": [start, end]}

        qs = qs.filter(**date_filter)

        # -----------------------------
        # 店舗フィルタ
        # -----------------------------
        if shop_id and shop_id != "all":
            if mode == "order":
                qs = qs.filter(order__shop_id=shop_id)
            else:
                qs = qs.filter(estimate__shop_id=shop_id)
        
        # -----------------------------
        # メーカーフィルタ ★追加
        # -----------------------------
        manufacturer_id = request.query_params.get("manufacturer_id")

        if manufacturer_id and manufacturer_id != "all":
            if mode == "order":
                qs = qs.filter(product__manufacturer_id=manufacturer_id)
            else:
                qs = qs.filter(manufacturer_id=manufacturer_id)

        # -----------------------------
        # 担当フィルタ
        # -----------------------------
        if staff_id and staff_id != "all":
            if mode == "order":
                qs = qs.filter(order__created_by_id=staff_id)
            else:
                qs = qs.filter(estimate__created_by_id=staff_id)

        # -----------------------------
        # 分析タイプ
        # -----------------------------
        if type_ == "category":

            from django.db.models import Q

            filter_category_id = request.query_params.get("filter_category_id")
            category_id = request.query_params.get("category_id")

            # -----------------------------
            # フィルター（広く絞る）
            # -----------------------------
            if filter_category_id:
                qs = qs.filter(
                    Q(category_id=filter_category_id) |
                    Q(category__parent_id=filter_category_id) |
                    Q(category__parent__parent_id=filter_category_id) |
                    Q(category__parent__parent__parent_id=filter_category_id)
                )

            # -----------------------------
            # ドリルダウン（配下全部）
            # -----------------------------
            if category_id:
                qs = qs.filter(
                    Q(category_id=category_id) |
                    Q(category__parent_id=category_id) |
                    Q(category__parent__parent_id=category_id) |
                    Q(category__parent__parent__parent_id=category_id)
                )

            # -----------------------------
            # 次の階層を判定
            # -----------------------------
            data = qs.select_related("category")

            result = {}

            for item in data:
                cat = item.category

                # ▼ root
                if not category_id:
                    current = cat

                    while current.parent:
                        current = current.parent

                    target = current

                # ▼ drill中
                else:
                    current = cat

                    # 🔥 完全一致ならそのまま
                    if str(current.id) == str(category_id):
                        target = current

                    else:
                        # 親を辿る（従来）
                        while current.parent and str(current.parent.id) != str(category_id):
                            current = current.parent

                        target = current

                if not target:
                    continue

                key = target.id

                if key not in result:
                    result[key] = {
                        "category_id": target.id,
                        "name": target.name,
                        "total": 0,
                        "count": 0,
                    }

                result[key]["total"] += item.subtotal or 0
                result[key]["count"] += 1 

            data = list(result.values())
            data = [d for d in data if d["total"] and d["total"] > 0]
            data.sort(key=lambda x: x["total"], reverse=True)

            grand_total = sum(float(d["total"]) for d in data)
            for d in data:
                d["share"] = round(float(d["total"]) / grand_total * 100, 1) if grand_total > 0 else 0.0

            return Response(data)

        elif type_ == "manufacturer":

            from django.db.models import Q as _Q
            _filter_cat = request.query_params.get("filter_category_id")
            if _filter_cat:
                qs = qs.filter(
                    _Q(category_id=_filter_cat) |
                    _Q(category__parent_id=_filter_cat) |
                    _Q(category__parent__parent_id=_filter_cat) |
                    _Q(category__parent__parent__parent_id=_filter_cat)
                )

            data = {}

            for item in qs:
                m = item.manufacturer
                if not m:
                    continue

                m_id = m.id

                # -----------------------------
                # メーカー初期化
                # -----------------------------
                if m_id not in data:
                    data[m_id] = {
                        "name": m.name,
                        "total": 0,
                        "count": 0,
                        "paths": {},  # ★ここ重要
                    }

                data[m_id]["total"] += item.subtotal or 0
                data[m_id]["count"] += 1 

                # -----------------------------
                # カテゴリパス
                # -----------------------------
                if item.category:
                    path = build_category_path(item.category)

                    key = " > ".join([p["name"] for p in path])

                    if key not in data[m_id]["paths"]:
                        data[m_id]["paths"][key] = {
                            "path": path,
                            "total": 0,
                            "count": 0,
                        }

                    data[m_id]["paths"][key]["total"] += item.subtotal or 0
                    data[m_id]["paths"][key]["count"] += 1 

            # -----------------------------
            # 整形
            # -----------------------------
            result = []

            for m in data.values():
                paths = list(m["paths"].values())
                paths.sort(key=lambda x: x["total"], reverse=True)

                result.append({
                    "name": m["name"],
                    "total": m["total"],
                    "paths": paths,
                })

            result.sort(key=lambda x: x["total"], reverse=True)

            return Response(result)

        elif type_ == "color":

            # -----------------------------
            # 🚀 vehicleベースに切替
            # -----------------------------
            if mode == "order":
                vqs = OrderVehicle.objects.filter(is_trade_in=False)
                vqs = vqs.select_related("color", "manufacturer", "order")

                # 日付
                vqs = vqs.filter(order__order_date__range=[start, end])

                # 店舗
                if shop_id and shop_id != "all":
                    vqs = vqs.filter(order__shop_id=shop_id)
                else:
                    vqs = vqs.filter(order__shop=request.user.shop)

                # 担当
                if staff_id and staff_id != "all":
                    vqs = vqs.filter(order__created_by_id=staff_id)

                total_field = "order__grand_total"

            else:
                vqs = EstimateVehicle.objects.filter(is_trade_in=False)
                vqs = vqs.select_related("color", "manufacturer", "estimate")

                vqs = vqs.filter(estimate__estimate_date__range=[start, end])

                if shop_id and shop_id != "all":
                    vqs = vqs.filter(estimate__shop_id=shop_id)
                else:
                    vqs = vqs.filter(estimate__shop=request.user.shop)

                if staff_id and staff_id != "all":
                    vqs = vqs.filter(estimate__created_by_id=staff_id)

                total_field = "estimate__grand_total"

            # -----------------------------
            # 🔥 色集計（ここが本体）
            # -----------------------------
            data = {}

            for v in vqs:
                # -----------------------------
                # 色
                # -----------------------------
                color = v.color.name if v.color else "不明"

                if color not in data:
                    data[color] = {
                        "color_label": color,
                        "count": 0,
                        "total": 0,
                        "categories": {}
                    }

                data[color]["count"] += 1

                # 金額
                if mode == "order":
                    data[color]["total"] += v.order.grand_total or 0
                else:
                    data[color]["total"] += v.estimate.grand_total or 0

                # -----------------------------
                # カテゴリ
                # -----------------------------
                if v.category:
                    cat_name = v.category.name

                    if cat_name not in data[color]["categories"]:
                        data[color]["categories"][cat_name] = {
                            "name": cat_name,
                            "count": 0,
                            "total": 0
                        }

                    data[color]["categories"][cat_name]["count"] += 1

                    if mode == "order":
                        data[color]["categories"][cat_name]["total"] += v.order.grand_total or 0
                    else:
                        data[color]["categories"][cat_name]["total"] += v.estimate.grand_total or 0


            # -----------------------------
            # 整形
            # -----------------------------
            result = []

            for c in data.values():
                cats = list(c["categories"].values())
                cats.sort(key=lambda x: x["count"], reverse=True)

                result.append({
                    "color_label": c["color_label"],
                    "count": c["count"],
                    "total": c["total"],
                    "categories": cats
                })

            result.sort(key=lambda x: x["count"], reverse=True)

            return Response(result)
        
        # ==========================================
        # 作業担当分析
        # ==========================================
        elif type_ == "staff_work":

            ITEM_TYPE_LABELS = {
                "vehicle":   "車両",
                "accessory": "用品",
                "insurance": "保険",
                "fee":       "諸費用",
                "discount":  "値引き",
            }

            # 月別集計のために order/estimate も select_related
            if mode == "order":
                qs = qs.select_related("order", "staff")
            else:
                qs = qs.select_related("estimate", "staff")

            data = {}

            for item in qs:
                staff = item.staff

                if not staff:
                    key  = "unknown"
                    name = "未割当"
                else:
                    key  = staff.id
                    name = staff.display_name

                if key not in data:
                    data[key] = {
                        "name":       name,
                        "total":      0,
                        "count":      0,
                        "categories": {},
                        "item_types": {},
                        "monthly":    {},
                    }

                data[key]["total"] += item.subtotal or 0
                data[key]["count"] += 1

                # 作業内容（カテゴリ）
                if item.category:
                    cat_name = item.category.name
                    if cat_name not in data[key]["categories"]:
                        data[key]["categories"][cat_name] = {"name": cat_name, "count": 0, "total": 0}
                    data[key]["categories"][cat_name]["count"] += 1
                    data[key]["categories"][cat_name]["total"] += item.subtotal or 0

                # 作業種別（item_type）
                itype       = item.item_type or "accessory"
                itype_label = ITEM_TYPE_LABELS.get(itype, itype)
                if itype not in data[key]["item_types"]:
                    data[key]["item_types"][itype] = {"key": itype, "name": itype_label, "count": 0, "total": 0}
                data[key]["item_types"][itype]["count"] += 1
                data[key]["item_types"][itype]["total"] += item.subtotal or 0

                # 月別集計
                ref_date = (
                    getattr(item.order,    "order_date",    None) if mode == "order"
                    else getattr(item.estimate, "estimate_date", None)
                )
                if ref_date:
                    month_key = str(ref_date)[:7]
                    if month_key not in data[key]["monthly"]:
                        data[key]["monthly"][month_key] = {"month": month_key, "count": 0, "total": 0}
                    data[key]["monthly"][month_key]["count"] += 1
                    data[key]["monthly"][month_key]["total"] += item.subtotal or 0

            # 整形
            result = []

            for s in data.values():
                cats   = sorted(list(s["categories"].values()), key=lambda x: x["total"],  reverse=True)
                itypes = sorted(list(s["item_types"].values()),  key=lambda x: x["total"],  reverse=True)
                monthly = sorted(list(s["monthly"].values()),    key=lambda x: x["month"])

                result.append({
                    "name":             s["name"],
                    "total":            s["total"],
                    "count":            s["count"],
                    "categories":       cats,
                    "item_types":       itypes,
                    "monthly":          monthly,
                    "category_breadth": len(s["item_types"]),
                })

            result.sort(key=lambda x: x["total"], reverse=True)

            return Response(result)

        else:
            raise ValidationError("typeが不正")

        return Response(data)
    

        