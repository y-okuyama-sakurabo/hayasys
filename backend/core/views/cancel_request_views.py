from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import Order
from core.models.cancel_request import CancelRequest
from core.serializers.cancel_request import CancelRequestSerializer

PRIVILEGED_ROLES = {"executive", "accounting"}


def _is_privileged(user):
    if getattr(user, "is_superuser", False):
        return True
    return getattr(user, "role", None) in PRIVILEGED_ROLES


def _remove_customer_vehicle_on_cancel(order):
    """
    受注キャンセル時に、この受注で登録した顧客所有車両を完全削除する。
    source_order FK で直接紐付けているため chassis_no 不問。
    """
    from core.models.customers import CustomerVehicle

    CustomerVehicle.objects.filter(source_order=order).delete()


# ── 申請一覧（①②のみ） ──────────────────────────────
class CancelRequestListView(generics.ListAPIView):
    serializer_class   = CancelRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not _is_privileged(self.request.user):
            return CancelRequest.objects.none()
        qs = CancelRequest.objects.select_related(
            "order", "requested_by", "reviewed_by"
        )
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


# ── 申請作成（誰でも可） ─────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_cancel_request(request, order_id):
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return Response({"detail": "受注が見つかりません"}, status=404)

    if order.status == "cancelled":
        return Response({"detail": "すでにキャンセル済みです"}, status=400)

    if CancelRequest.objects.filter(order=order, status="pending").exists():
        return Response({"detail": "すでにキャンセル申請中です"}, status=400)

    reason = request.data.get("reason", "").strip()
    if not reason:
        return Response({"detail": "キャンセル理由を入力してください"}, status=400)

    cr = CancelRequest.objects.create(
        order=order,
        requested_by=request.user,
        reason=reason,
    )
    return Response(CancelRequestSerializer(cr).data, status=201)


# ── 承認（①②のみ） ──────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def approve_cancel_request(request, pk):
    if not _is_privileged(request.user):
        return Response({"detail": "権限がありません"}, status=403)

    try:
        cr = CancelRequest.objects.select_related("order").get(pk=pk, status="pending")
    except CancelRequest.DoesNotExist:
        return Response({"detail": "申請が見つかりません"}, status=404)

    cr.status      = "approved"
    cr.reviewed_by = request.user
    cr.reviewed_at = timezone.now()
    cr.save()

    order = cr.order
    order.status = "cancelled"
    order.save(update_fields=["status"])

    # 所有車両を解除
    _remove_customer_vehicle_on_cancel(order)

    return Response(CancelRequestSerializer(cr).data)


# ── 却下（①②のみ） ──────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reject_cancel_request(request, pk):
    if not _is_privileged(request.user):
        return Response({"detail": "権限がありません"}, status=403)

    try:
        cr = CancelRequest.objects.get(pk=pk, status="pending")
    except CancelRequest.DoesNotExist:
        return Response({"detail": "申請が見つかりません"}, status=404)

    cr.status      = "rejected"
    cr.reviewed_by = request.user
    cr.reviewed_at = timezone.now()
    cr.save()

    return Response(CancelRequestSerializer(cr).data)


# ── 受注ごとの申請状況（フロント用） ────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_cancel_request_status(request, order_id):
    cr = CancelRequest.objects.filter(order_id=order_id).order_by("-created_at").first()
    if not cr:
        return Response(None)
    return Response(CancelRequestSerializer(cr).data)


# ── キャンセル取消（①②のみ） ──────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def uncancel_order(request, pk):
    if not _is_privileged(request.user):
        return Response({"detail": "権限がありません"}, status=403)

    try:
        order = Order.objects.get(pk=pk)
    except Order.DoesNotExist:
        return Response({"detail": "受注が見つかりません"}, status=404)

    if order.status != "cancelled":
        return Response({"detail": "キャンセル済みではありません"}, status=400)

    order.status = "ordered"
    order.save(update_fields=["status"])

    # キャンセル申請レコードを削除（一覧から消す）
    CancelRequest.objects.filter(order=order).delete()

    # 所有車両を再登録
    from core.services.order_finalize import create_customer_vehicle_from_order
    create_customer_vehicle_from_order(order)

    return Response({"detail": "キャンセルを取消しました", "order_id": pk})


# ── 受注削除（①②のみ） ──────────────────────────────
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_order_privileged(request, pk):
    if not _is_privileged(request.user):
        return Response({"detail": "権限がありません"}, status=403)

    try:
        order = Order.objects.select_related("estimate").get(pk=pk)
    except Order.DoesNotExist:
        return Response({"detail": "受注が見つかりません"}, status=404)

    # 元見積があれば「作成済み」に戻す
    if order.estimate_id and order.estimate:
        estimate = order.estimate
        remaining = estimate.orders.exclude(pk=order.pk).filter(
            status__in=["ordered", "delivered", "sales_completed"]
        ).exists()
        if not remaining:
            estimate.status = "issued"
            estimate.save(update_fields=["status"])

    order.delete()
    return Response(status=204)
