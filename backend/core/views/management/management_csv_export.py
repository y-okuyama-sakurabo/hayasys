import csv
import io
from decimal import Decimal
from urllib.parse import quote

from django.db.models import Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.models import Order
from core.models.order_delivery_payment import PaymentManagement


SALE_TYPE_LABEL = {
    "new":         "新車",
    "used":        "中古車",
    "rental_up":   "レンタルアップ",
    "consignment": "委託販売",
}

METHOD_LABEL = {
    "cash":          "現金",
    "bank_transfer": "銀行振込",
    "credit_card":   "クレジット",
    "loan":          "ローン",
    "other":         "その他",
}

TAX_RATE = Decimal("1.10")


class ManagementCSVExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Order.objects
            .select_related("shop", "payment_management")
            .prefetch_related(
                "items__category",
                "payment_management__records",
            )
            .order_by("order_date", "order_no")
        )

        # ── フィルタ（一覧と同じ条件） ──
        shop_id   = request.GET.get("shop_id")
        month     = request.GET.get("month")
        date_from = request.GET.get("date_from")
        date_to   = request.GET.get("date_to")

        if shop_id and shop_id != "all":
            qs = qs.filter(shop_id=shop_id)

        if month:
            try:
                year, m = month.split("-")
                qs = qs.filter(order_date__year=int(year), order_date__month=int(m))
            except Exception:
                pass

        if date_from:
            qs = qs.filter(order_date__gte=date_from)
        if date_to:
            qs = qs.filter(order_date__lte=date_to)

        # ── CSV 生成 ──
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "伝票番号",
            "受注日",
            "顧客名",
            "区分",
            "カテゴリ",
            "金額（税込）",
            "非課税",
            "入金状況",
            "入金種別",
        ])

        for order in qs:
            # 入金情報
            try:
                pm = order.payment_management
                records = list(pm.records.all())
                paid_total = sum(r.amount for r in records)
                methods = "/".join(
                    METHOD_LABEL.get(r.method, r.method) for r in records
                ) if records else ""
            except PaymentManagement.DoesNotExist:
                paid_total = Decimal("0")
                methods = ""

            grand_total = order.grand_total or Decimal("0")
            if grand_total <= 0:
                payment_status = "入金済"
            elif paid_total <= 0:
                payment_status = "未入金"
            elif paid_total < grand_total:
                payment_status = "一部入金"
            else:
                payment_status = "入金済"

            for item in order.items.all():
                # 区分（item の sale_type）
                sale_type = SALE_TYPE_LABEL.get(item.sale_type or "", item.sale_type or "")

                # 税込金額
                subtotal = item.subtotal or Decimal("0")
                if item.tax_type == "taxable":
                    amount = int((subtotal * TAX_RATE).quantize(Decimal("1")))
                else:
                    amount = int(subtotal)

                non_taxable    = "非課税" if item.tax_type == "non_taxable" else ""
                category_name  = item.category.name if item.category else ""

                writer.writerow([
                    order.order_no,
                    str(order.order_date) if order.order_date else "",
                    order.party_name or "",
                    sale_type,
                    category_name,
                    amount,
                    non_taxable,
                    payment_status,
                    methods,
                ])

        today    = timezone.localdate().strftime("%Y%m%d")
        filename = f"delivery_payment_{today}.csv"
        csv_data = output.getvalue().encode("cp932", errors="replace")

        response = HttpResponse(csv_data, content_type="text/csv; charset=cp932")
        response["Content-Disposition"] = (
            f"attachment; filename*=UTF-8''{quote(filename)}"
        )
        return response
