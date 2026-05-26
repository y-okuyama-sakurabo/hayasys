from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from django.shortcuts import get_object_or_404

from core.models import Customer
from core.models.estimates import Estimate
from core.models.orders import Order


class CustomerTransactionHistoryAPIView(APIView):
    """
    顧客に紐づく見積・受注を時系列で返す。
    GET /customers/<customer_id>/transactions/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, customer_id):
        get_object_or_404(Customer, pk=customer_id)

        # 見積（party.source_customer 経由）
        estimates = (
            Estimate.objects
            .filter(party__source_customer_id=customer_id)
            .select_related("party", "created_by")
            .order_by("estimate_date", "created_at")
        )

        # 受注（customer FK 直接）
        orders = (
            Order.objects
            .filter(customer_id=customer_id)
            .select_related("created_by")
            .order_by("order_date", "created_at")
        )

        items = []

        for e in estimates:
            items.append({
                "type": "estimate",
                "id": e.id,
                "no": e.estimate_no,
                "date": e.estimate_date or e.created_at.date(),
                "status": e.get_status_display(),
                "status_key": e.status,
                "grand_total": e.grand_total,
                "staff": (
                    e.created_by.display_name or e.created_by.login_id
                    if e.created_by else None
                ),
                "created_at": e.created_at,
            })

        for o in orders:
            items.append({
                "type": "order",
                "id": o.id,
                "no": o.order_no,
                "date": o.order_date or o.created_at.date(),
                "status": o.get_status_display(),
                "status_key": o.status,
                "grand_total": o.grand_total,
                "staff": (
                    o.created_by.display_name or o.created_by.login_id
                    if o.created_by else None
                ),
                "created_at": o.created_at,
            })

        # date の昇順（None は末尾）でソート
        items.sort(key=lambda x: (x["date"] is None, x["date"] or "", x["created_at"]))

        return Response(items)
