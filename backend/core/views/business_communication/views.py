from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from django.shortcuts import get_object_or_404
from django.db.models import Q

from core.models import (
    BusinessCommunicationThread,
    BusinessCommunication,
    Customer,
)

from core.serializers.business_communications import (
    BusinessCommunicationSerializer,
    BusinessCommunicationWriteSerializer,
    BusinessCommunicationThreadSerializer,
)


# ==================================================
# 共通ユーティリティ
# ==================================================

def _user_shop(user):
    return getattr(user, "shop", None)


def _can_access_thread(user, thread: BusinessCommunicationThread) -> bool:

    shop = _user_shop(user)

    return BusinessCommunication.objects.filter(
        thread=thread
    ).filter(
        Q(sender_shop=shop)
        | Q(receiver_shop=shop)
        | Q(sender_staff=user)
        | Q(receiver_staff=user)
    ).exists() or thread.created_by_id == user.id


def _can_access_message(user, message: BusinessCommunication) -> bool:

    shop = _user_shop(user)

    return (
        message.sender_staff_id == user.id
        or message.receiver_staff_id == user.id
        or (shop and message.sender_shop_id == shop.id)
        or (shop and message.receiver_shop_id == shop.id)
    )


# ==================================================
# 顧客別スレッド一覧 / 作成
# ==================================================

class CustomerBusinessCommunicationThreadListCreateAPIView(
    generics.ListCreateAPIView
):

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BusinessCommunicationThreadSerializer

    def get_queryset(self):

        customer_id = self.kwargs["customer_id"]

        return (
            BusinessCommunicationThread.objects
            .filter(customer_id=customer_id)
            .select_related("customer", "created_by")
            .prefetch_related(
                "messages",
                "messages__attachments"
            )
            .order_by("-updated_at")
        )

    def create(self, request, *args, **kwargs):

        customer_id = self.kwargs["customer_id"]

        customer = get_object_or_404(Customer, pk=customer_id)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        thread = serializer.save(
            customer=customer,
            created_by=request.user,
        )

        return Response(
            BusinessCommunicationThreadSerializer(thread).data,
            status=status.HTTP_201_CREATED,
        )

# ==================================================
# スレッド取得、削除
# ==================================================

class BusinessCommunicationThreadRetrieveDestroyAPIView(
    generics.RetrieveDestroyAPIView
):

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BusinessCommunicationThreadSerializer

    queryset = (
        BusinessCommunicationThread.objects
        .select_related("customer", "created_by")
        .prefetch_related("messages")
    )

    def get_object(self):

        obj = super().get_object()

        if not _can_access_thread(self.request.user, obj):
            raise permissions.PermissionDenied(
                "このスレッドにアクセスする権限がありません"
            )

        return obj

    def destroy(self, request, *args, **kwargs):

        thread = self.get_object()

        if thread.created_by != request.user:
            return Response(
                {"detail": "このスレッドを削除する権限がありません"},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(request, *args, **kwargs)


# ==================================================
# メッセージ一覧 / 投稿
# ==================================================

class BusinessCommunicationMessageListCreateAPIView(
    generics.ListCreateAPIView
):

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):

        thread_id = self.kwargs["thread_id"]
        user = self.request.user
        shop = _user_shop(user)

        return (
            BusinessCommunication.objects
            .filter(thread_id=thread_id)
            .filter(
                Q(sender_shop=shop)
                | Q(receiver_shop=shop)
                | Q(sender_staff=user)
                | Q(receiver_staff=user)
            )
            .select_related(
                "customer",
                "sender_shop",
                "sender_staff",
                "receiver_shop",
                "receiver_staff",
                "created_by",
            )
            .prefetch_related("attachments")
            .order_by("created_at")
        )

    def get_serializer_class(self):

        if self.request.method == "POST":
            return BusinessCommunicationWriteSerializer

        return BusinessCommunicationSerializer

    def create(self, request, *args, **kwargs):

        thread_id = self.kwargs["thread_id"]

        thread = get_object_or_404(
            BusinessCommunicationThread,
            pk=thread_id
        )

        if not _can_access_thread(request.user, thread):
            return Response(
                {"detail": "このスレッドに投稿する権限がありません"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        shop = _user_shop(user)

        sender_type = request.data.get("sender_type", "staff")

        receiver_shop = serializer.validated_data.get("receiver_shop")
        receiver_staff = serializer.validated_data.get("receiver_staff")

        sender_shop = None
        sender_staff = None

        if sender_type == "shop":
            sender_shop = shop
        else:
            sender_staff = user

        message = serializer.save(
            thread=thread,
            customer=thread.customer,
            sender_shop=sender_shop,
            sender_staff=sender_staff,
            receiver_shop=receiver_shop,
            receiver_staff=receiver_staff,
            created_by=user,
        )

        message = (
            BusinessCommunication.objects
            .select_related(
                "customer",
                "sender_shop",
                "sender_staff",
                "receiver_shop",
                "receiver_staff",
                "created_by",
            )
            .prefetch_related("attachments")
            .get(pk=message.pk)
        )

        return Response(
            BusinessCommunicationSerializer(
                message,
                context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )


# ==================================================
# メッセージ取得 / 編集 / 削除
# ==================================================

class BusinessCommunicationRetrieveUpdateDestroyAPIView(
    generics.RetrieveUpdateDestroyAPIView
):

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    queryset = (
        BusinessCommunication.objects
        .select_related(
            "customer",
            "sender_shop",
            "sender_staff",
            "receiver_shop",
            "receiver_staff",
            "created_by",
            "thread",
        )
        .prefetch_related("attachments")
    )

    def get_serializer_class(self):

        if self.request.method in ["PUT", "PATCH"]:
            return BusinessCommunicationWriteSerializer

        return BusinessCommunicationSerializer

    def get_object(self):

        obj = super().get_object()

        if not _can_access_message(self.request.user, obj):
            raise permissions.PermissionDenied(
                "この業務連絡にアクセスする権限がありません"
            )

        return obj

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        if not _can_access_message(self.request.user, instance):
            return Response(
                {"detail": "この業務連絡を削除する権限がありません"},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(request, *args, **kwargs)