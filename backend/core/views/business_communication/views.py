from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from django.shortcuts import get_object_or_404
from django.db.models import Q

from core.models import BusinessCommunication, Customer
from core.models.business_communication_attachments import BusinessCommunicationAttachment
from core.serializers.business_communications import (
    BusinessCommunicationSerializer,
    BusinessCommunicationWriteSerializer,
)


def _user_shop(user):
    return getattr(user, "shop", None)


def _can_access(user, bc: BusinessCommunication) -> bool:
    """
    ✅ 送信店舗 or 宛先店舗に所属している人だけアクセスOK
    """
    shop = _user_shop(user)
    if not shop:
        return False
    return (bc.sender_shop_id == shop.id) or (bc.receiver_shop_id == shop.id)


# -----------------------------
# 顧客別業務連絡一覧・登録
# -----------------------------
class CustomerBusinessCommunicationListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]  # ✅ 添付ありPOSTのため

    def get_queryset(self):
        customer_id = self.kwargs["customer_id"]
        shop = _user_shop(self.request.user)

        if not shop:
            return BusinessCommunication.objects.none()

        qs = (
            BusinessCommunication.objects.filter(
                Q(sender_shop=shop) | Q(receiver_shop=shop),
                customer_id=customer_id,
            )
            .select_related("customer", "sender_shop", "receiver_shop", "created_by")
            .prefetch_related("attachments")
            .order_by("-created_at")
        )

        # ✅ status フィルタ（?status=pending / ?status=done）
        status_q = self.request.query_params.get("status")
        if status_q in ["pending", "done"]:
            qs = qs.filter(status=status_q)

        return qs

    def get_serializer_class(self):
        return BusinessCommunicationWriteSerializer if self.request.method == "POST" else BusinessCommunicationSerializer

    def create(self, request, *args, **kwargs):
        customer_id = self.kwargs["customer_id"]
        customer = get_object_or_404(Customer, pk=customer_id)

        user = request.user
        sender_shop = _user_shop(user)
        if not sender_shop:
            return Response({"detail": "所属店舗がないため送信できません"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # WriteSerializer側で files = ListField(child=ImageField(), required=False) を想定
        files = serializer.validated_data.pop("files", [])

        bc = BusinessCommunication.objects.create(
            customer=customer,
            sender_shop=sender_shop,
            created_by=user,
            receiver_shop=serializer.validated_data["receiver_shop"],
            title=serializer.validated_data["title"],
            content=serializer.validated_data["content"],
        )

        for f in files:
            BusinessCommunicationAttachment.objects.create(
                communication=bc,
                file=f,
                mime=getattr(f, "content_type", "") or "",
                bytes=getattr(f, "size", 0) or 0,
            )

        # attachments を含めて返す（prefetch効かせるなら取り直し）
        bc = (
            BusinessCommunication.objects
            .select_related("customer", "sender_shop", "receiver_shop", "created_by")
            .prefetch_related("attachments")
            .get(pk=bc.pk)
        )
        out = BusinessCommunicationSerializer(bc, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)



# -----------------------------
# 自店舗宛て業務連絡一覧（ダッシュボード用）
# -----------------------------
class ShopBusinessCommunicationListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BusinessCommunicationSerializer

    def get_queryset(self):
        shop = _user_shop(self.request.user)
        if not shop:
            return BusinessCommunication.objects.none()

        qs = (
            BusinessCommunication.objects
            .filter(receiver_shop=shop)
            .select_related("customer", "sender_shop", "receiver_shop", "created_by")
            .prefetch_related("attachments")
            .order_by("-created_at")
        )

        # 任意：?status=pending の対応（フロントで使ってるので）
        status_q = self.request.query_params.get("status")
        if status_q in ["pending", "done"]:
            qs = qs.filter(status=status_q)

        return qs


# -----------------------------
# ステータス更新API（未対応 → 対応済み）
# -----------------------------
class BusinessCommunicationStatusUpdateAPIView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = BusinessCommunication.objects.all()
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()

        # ✅ 要件：送信店舗 or 宛先店舗の人なら更新OK
        if not _can_access(request.user, instance):
            return Response(
                {"detail": "この業務連絡を更新する権限がありません"},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = request.data.get("status")
        if new_status not in ["pending", "done"]:
            return Response({"detail": "無効なステータスです。"}, status=status.HTTP_400_BAD_REQUEST)

        instance.status = new_status
        instance.save(update_fields=["status"])

        return Response({"message": "ステータスを更新しました", "status": instance.status})


# -----------------------------
# 取得 / 編集 / 削除
# -----------------------------
class BusinessCommunicationRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser] 
    queryset = (
        BusinessCommunication.objects
        .select_related("customer", "sender_shop", "receiver_shop", "created_by")
        .prefetch_related("attachments")
    )

    def get_serializer_class(self):
        return BusinessCommunicationWriteSerializer if self.request.method in ["PUT", "PATCH"] else BusinessCommunicationSerializer

    def get_object(self):
        obj = super().get_object()
        # ✅ 送信店舗 or 宛先店舗だけアクセス可能（retrieve含む）
        if not _can_access(self.request.user, obj):
            raise permissions.PermissionDenied("この業務連絡にアクセスする権限がありません")
        return obj

    def _can_edit_or_delete(self, instance: BusinessCommunication) -> bool:
        # ✅ 要件：送信店舗 or 宛先店舗の人ならOK
        # （pending縛りを残したいなら下の2行を有効化）
        # if instance.status != "pending":
        #     return False
        return _can_access(self.request.user, instance)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._can_edit_or_delete(instance):
            return Response({"detail": "この業務連絡を編集する権限がありません"}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(instance, data=request.data, partial=(request.method == "PATCH"))
        serializer.is_valid(raise_exception=True)

        # ✅ title/content/receiver_shop 等の更新
        self.perform_update(serializer)

        # ✅ 追加添付（任意：filesが来たら追加する）
        files = serializer.validated_data.pop("files", [])
        for f in files:
            BusinessCommunicationAttachment.objects.create(
                communication=instance,
                file=f,
                mime=getattr(f, "content_type", "") or "",
                bytes=getattr(f, "size", 0) or 0,
            )

        # 返却はRead serializerで attachments 含めて返す
        instance.refresh_from_db()
        instance = (
            BusinessCommunication.objects
            .select_related("customer", "sender_shop", "receiver_shop", "created_by")
            .prefetch_related("attachments")
            .get(pk=instance.pk)
        )
        out = BusinessCommunicationSerializer(instance, context={"request": request})
        return Response(out.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not self._can_edit_or_delete(instance):
            return Response({"detail": "この業務連絡を削除する権限がありません"}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)
