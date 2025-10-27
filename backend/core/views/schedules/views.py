from rest_framework import generics, permissions
from core.models import Schedule
from core.serializers.schedules import ScheduleSerializer


# -----------------------------
# 顧客別スケジュール一覧・登録
# -----------------------------
class CustomerScheduleListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        customer_id = self.kwargs["customer_id"]
        return (
            Schedule.objects
            .filter(customer_id=customer_id)
            .select_related("customer", "shop", "staff")
            .order_by("-start_at")
        )

    def perform_create(self, serializer):
        customer_id = self.kwargs["customer_id"]
        serializer.save(
            customer_id=customer_id,
            staff=self.request.user,
            shop=getattr(self.request.user, "shop", None),
        )


# -----------------------------
# 単体スケジュール取得・編集・削除
# -----------------------------
class ScheduleRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]


# -----------------------------
# トップページ用スケジュール一覧・登録
# -----------------------------
class ScheduleListCreateAPIView(generics.ListCreateAPIView):
    """
    - 通常ユーザー: 自身の所属店舗のスケジュールを表示
    - 管理者（is_staff=True or role='admin'）: 全店舗を表示
    """
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # 管理者は全店舗のスケジュール
        if user.is_staff or getattr(user, "role", "") == "admin":
            return Schedule.objects.select_related("customer", "shop", "staff").order_by("-start_at")

        # 所属店舗があるユーザー
        if user.shop:
            return (
                Schedule.objects
                .filter(shop=user.shop)
                .select_related("customer", "shop", "staff")
                .order_by("-start_at")
            )

        # 所属店舗がない場合は自分のスケジュールのみ
        return (
            Schedule.objects
            .filter(staff=user)
            .select_related("customer", "shop", "staff")
            .order_by("-start_at")
        )

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(
            staff=user,
            shop=getattr(user, "shop", None),
        )
