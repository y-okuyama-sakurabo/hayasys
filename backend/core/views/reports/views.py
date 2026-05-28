"""
帳票API
- ar_list     : 売掛金リスト
- credit_list : クレジットリスト
"""
from datetime import datetime, date
from decimal import Decimal

from django.db.models import Sum, F, Value, DecimalField, OuterRef, Subquery
from django.db.models.functions import Coalesce
from django.contrib.contenttypes.models import ContentType
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from core.models import Order, PaymentRecord, Payment


# ─────────────────────────────────────────────
# 入金済み合計をサブクエリで取得（N+1回避）
# ─────────────────────────────────────────────
def _paid_subquery():
    return Coalesce(
        Subquery(
            PaymentRecord.objects.filter(
                payment_management__order_id=OuterRef("pk")
            ).values("payment_management__order_id")
             .annotate(s=Sum("amount"))
             .values("s")[:1],
            output_field=DecimalField(max_digits=12, decimal_places=2),
        ),
        Value(Decimal("0")),
        output_field=DecimalField(max_digits=12, decimal_places=2),
    )


def _parse_dates(request):
    start_str = request.query_params.get("start")
    end_str   = request.query_params.get("end")
    try:
        start = datetime.strptime(start_str, "%Y-%m-%d").date() if start_str else None
        end   = datetime.strptime(end_str,   "%Y-%m-%d").date() if end_str   else None
    except Exception:
        raise ValidationError("日付形式は YYYY-MM-DD で指定してください")
    return start, end


def _apply_shop_filter(qs, request, shop_id, prefix=""):
    """受注クエリに店舗フィルタを適用"""
    field     = f"{prefix}shop_id" if prefix else "shop_id"
    field_obj = f"{prefix}shop"    if prefix else "shop"
    if shop_id and shop_id != "all":
        return qs.filter(**{field: shop_id})
    elif not shop_id:
        return qs.filter(**{field_obj: request.user.shop})
    return qs


def _order_row(o, paid):
    ar = max(Decimal("0"), o.grand_total - paid)
    return {
        "order_no":      o.order_no,
        "order_date":    str(o.order_date) if o.order_date else "",
        "delivery_date": str(o.final_delivery_date) if o.final_delivery_date else "",
        "customer_name": o.party_name,
        "phone":         o.phone or "",
        "shop_name":     o.shop.name if o.shop else "",
        "staff_name":    o.created_by.display_name if o.created_by else "",
        "grand_total":   float(o.grand_total),
        "paid_amount":   float(paid),
        "ar_amount":     float(ar),
    }


class ReportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        report_type = request.query_params.get("type", "ar_list")
        shop_id     = request.query_params.get("shop_id")
        staff_id    = request.query_params.get("staff_id")
        start, end  = _parse_dates(request)

        if report_type == "ar_list":
            return self._ar_list(request, start, end, shop_id, staff_id)
        elif report_type == "credit_list":
            return self._credit_list(request, start, end, shop_id)
        else:
            raise ValidationError("typeが不正")

    # ──────────────────────────────────────────
    # 売掛金リスト
    # ──────────────────────────────────────────
    def _ar_list(self, request, start, end, shop_id, staff_id):
        qs = (
            Order.objects
            .filter(delivery_status="delivered")
            .select_related("shop", "created_by")
            .annotate(paid_amount=_paid_subquery())
            .filter(paid_amount__lt=F("grand_total"))
        )
        qs = _apply_shop_filter(qs, request, shop_id)

        if staff_id and staff_id != "all":
            qs = qs.filter(created_by_id=staff_id)

        if start and end:
            qs = qs.filter(order_date__range=[start, end])
        elif start:
            qs = qs.filter(order_date__gte=start)
        elif end:
            qs = qs.filter(order_date__lte=end)

        qs = qs.order_by("order_date", "order_no")

        rows = [_order_row(o, o.paid_amount) for o in qs]
        return Response({
            "rows": rows,
            "totals": _totals(rows),
        })

    # ──────────────────────────────────────────
    # クレジットリスト
    # ──────────────────────────────────────────
    def _credit_list(self, request, start, end, shop_id):
        order_qs = Order.objects.filter(payments__isnull=False).select_related("shop").distinct()
        order_qs = _apply_shop_filter(order_qs, request, shop_id)
        if start and end:
            order_qs = order_qs.filter(order_date__range=[start, end])

        order_map = {o.id: o for o in order_qs}

        order_ct = ContentType.objects.get_for_model(Order)
        payments = (
            Payment.objects
            .filter(content_type=order_ct, object_id__in=order_map.keys())
            .order_by("credit_company", "object_id")
        )

        company_data: dict = {}
        for p in payments:
            company = p.credit_company or "（会社名なし）"
            o = order_map.get(p.object_id)
            if not o:
                continue

            if company not in company_data:
                company_data[company] = {"credit_company": company, "orders": [], "total": 0.0, "count": 0}

            credit_total = float(
                (p.credit_first_payment  or 0) +
                (p.credit_second_payment or 0) +
                (p.credit_bonus_payment  or 0)
            ) or float(o.grand_total)

            company_data[company]["orders"].append({
                "order_no":       o.order_no,
                "order_date":     str(o.order_date) if o.order_date else "",
                "customer_name":  o.party_name,
                "shop_name":      o.shop.name if o.shop else "",
                "grand_total":    float(o.grand_total),
                "credit_total":   credit_total,
                "first_payment":  float(p.credit_first_payment  or 0),
                "second_payment": float(p.credit_second_payment or 0),
                "bonus_payment":  float(p.credit_bonus_payment  or 0),
                "installments":   p.credit_installments,
                "start_month":    p.credit_start_month or "",
            })
            company_data[company]["total"] += credit_total
            company_data[company]["count"] += 1

        rows = sorted(company_data.values(), key=lambda x: x["credit_company"])
        for r in rows:
            r["orders"] = sorted(r["orders"], key=lambda x: x["order_date"])

        return Response({
            "rows": rows,
            "totals": {
                "total": sum(r["total"] for r in rows),
                "count": sum(r["count"] for r in rows),
            },
        })


def _totals(rows: list) -> dict:
    return {
        "grand_total": sum(r["grand_total"] for r in rows),
        "paid_amount": sum(r["paid_amount"] for r in rows),
        "ar_amount":   sum(r["ar_amount"]   for r in rows),
        "count":       len(rows),
    }
