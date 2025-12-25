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
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Schedule.objects.select_related("customer", "shop", "staff")

        # -------------------------
        # 店舗フィルタ（最優先）
        # -------------------------
        shop_id = self.request.query_params.get("shop_id")
        if shop_id:
            qs = qs.filter(shop_id=shop_id)
        else:
            # shop_id 未指定時のデフォルト挙動
            if not (user.is_staff or getattr(user, "role", "") == "admin"):
                if user.shop:
                    qs = qs.filter(shop=user.shop)
                else:
                    qs = qs.filter(staff=user)

        # -------------------------
        # 期間フィルタ（カレンダー用）
        # -------------------------
        start = self.request.query_params.get("start")
        end = self.request.query_params.get("end")
        if start and end:
            qs = qs.filter(
                start_at__lt=end,
                end_at__gte=start
            )

        return qs.order_by("start_at")

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(
            staff=user,
            shop=getattr(user, "shop", None),
        )

