from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView

from django.shortcuts import get_object_or_404
from django.db.models import Q

from core.models import (
    BusinessCommunicationThread,
    BusinessCommunication,
    BusinessCommunicationAttachment,
    Customer,
    Shop,
)
from django.contrib.auth import get_user_model

from core.serializers.business_communications import (
    BusinessCommunicationSerializer,
    BusinessCommunicationWriteSerializer,
    BusinessCommunicationThreadSerializer,
)

User = get_user_model()


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
# 全スレッド一覧 / 新規作成（顧客任意）
# ==================================================

def _thread_prefetch(qs):
    return qs.select_related(
        "customer", "created_by"
    ).prefetch_related(
        "messages",
        "messages__attachments",
        "messages__sender_shop",
        "messages__sender_staff",
        "messages__receiver_shop",
        "messages__receiver_staff",
    ).order_by("-updated_at")


class CommunicationThreadListCreateAPIView(generics.ListCreateAPIView):

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BusinessCommunicationThreadSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):

        user = self.request.user
        shop = _user_shop(user)

        conditions = (
            Q(created_by=user)
            | Q(messages__sender_staff=user)
            | Q(messages__receiver_staff=user)
        )

        if shop:
            conditions |= (
                Q(messages__sender_shop=shop)
                | Q(messages__receiver_shop=shop)
            )

        qs = BusinessCommunicationThread.objects.filter(conditions).distinct()

        status_param = self.request.query_params.get("status")
        if status_param in ("pending", "done"):
            qs = qs.filter(status=status_param)

        return _thread_prefetch(qs)

    def create(self, request, *args, **kwargs):

        title = request.data.get("title", "").strip()
        content = request.data.get("content", "").strip()
        sender_type = request.data.get("sender_type", "staff")
        receiver_shop_id = request.data.get("receiver_shop")
        receiver_staff_id = request.data.get("receiver_staff")
        customer_id = request.data.get("customer_id")
        files = request.FILES.getlist("files")

        errors = {}
        if not title:
            errors["title"] = "タイトルは必須です"
        if not content:
            errors["content"] = "内容は必須です"
        if not receiver_shop_id and not receiver_staff_id:
            errors["receiver"] = "送信先を指定してください"
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        shop = _user_shop(user)

        customer = None
        if customer_id:
            customer = get_object_or_404(Customer, pk=customer_id)

        receiver_shop = None
        if receiver_shop_id:
            receiver_shop = get_object_or_404(Shop, pk=receiver_shop_id)

        receiver_staff = None
        if receiver_staff_id:
            receiver_staff = get_object_or_404(User, pk=receiver_staff_id)

        thread = BusinessCommunicationThread.objects.create(
            title=title,
            customer=customer,
            created_by=user,
        )

        sender_shop = shop if sender_type == "shop" else None
        sender_staff = user if sender_type == "staff" else None

        message = BusinessCommunication.objects.create(
            thread=thread,
            customer=customer,
            sender_shop=sender_shop,
            sender_staff=sender_staff,
            receiver_shop=receiver_shop,
            receiver_staff=receiver_staff,
            content=content,
            created_by=user,
        )

        for f in files:
            BusinessCommunicationAttachment.objects.create(
                communication=message,
                file=f,
                mime=getattr(f, "content_type", "") or "",
                bytes=getattr(f, "size", 0) or 0,
            )

        thread = _thread_prefetch(
            BusinessCommunicationThread.objects.filter(pk=thread.pk)
        ).first()

        return Response(
            BusinessCommunicationThreadSerializer(thread).data,
            status=status.HTTP_201_CREATED,
        )


# ==================================================
# スレッドステータス更新
# ==================================================

class CommunicationThreadStatusUpdateAPIView(APIView):

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):

        thread = get_object_or_404(BusinessCommunicationThread, pk=pk)

        if not _can_access_thread(request.user, thread):
            return Response(
                {"detail": "このスレッドにアクセスする権限がありません"},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = request.data.get("status")
        if new_status not in ("pending", "done"):
            return Response(
                {"status": "pending または done を指定してください"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        thread.status = new_status
        thread.save(update_fields=["status", "updated_at"])

        return Response({"id": thread.id, "status": thread.status})


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
    generics.RetrieveUpdateDestroyAPIView
):

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BusinessCommunicationThreadSerializer

    serializer_class = BusinessCommunicationThreadSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

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