from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q

from core.models import BusinessCommunication, Customer
from core.serializers.business_communications import (
    BusinessCommunicationSerializer,
    BusinessCommunicationWriteSerializer,
)


# -----------------------------
# 顧客別業務連絡一覧・登録
# -----------------------------
class CustomerBusinessCommunicationListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        customer_id = self.kwargs["customer_id"]
        user = self.request.user
        shop = getattr(user, "shop", None)

        if not shop:
            return BusinessCommunication.objects.none()

        return (
        BusinessCommunication.objects.filter(
            Q(sender_shop=shop) | Q(receiver_shop=shop),
            customer_id=customer_id,
        )


            .select_related("customer", "sender_shop", "receiver_shop", "created_by")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        # POST時だけ書き込み用シリアライザに切り替え
        if self.request.method == "POST":
            return BusinessCommunicationWriteSerializer
        return BusinessCommunicationSerializer

    def perform_create(self, serializer):
        customer_id = self.kwargs["customer_id"]
        customer = get_object_or_404(Customer, pk=customer_id)

        user = self.request.user
        sender_shop = getattr(user, "shop", None)

        serializer.save(
            customer=customer,
            sender_shop=sender_shop,
            created_by=user,
        )


# -----------------------------
# 自店舗宛て業務連絡一覧（ダッシュボード用）
# -----------------------------
class ShopBusinessCommunicationListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BusinessCommunicationSerializer

    def get_queryset(self):
        user = self.request.user
        shop = getattr(user, "shop", None)

        if not shop:
            return BusinessCommunication.objects.none()

        return (
            BusinessCommunication.objects
            .filter(receiver_shop=shop)
            .select_related("customer", "sender_shop", "receiver_shop", "created_by")
            .order_by("-created_at")
        )


# -----------------------------
# ステータス更新API（未対応 → 対応済み）
# -----------------------------
class BusinessCommunicationStatusUpdateAPIView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = BusinessCommunication.objects.all()

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        user_shop = getattr(user, "shop", None)

        # 受信店舗のみステータス更新可能
        if instance.receiver_shop != user_shop:
            return Response(
                {"detail": "この業務連絡を更新する権限がありません"},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = request.data.get("status")

        if new_status not in ["pending", "done"]:
            return Response(
                {"detail": "無効なステータスです。"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        instance.status = new_status
        instance.save(update_fields=["status"])

        return Response(
            {
                "message": "ステータスを更新しました",
                "status": instance.status,
            },
            status=status.HTTP_200_OK,
        )
