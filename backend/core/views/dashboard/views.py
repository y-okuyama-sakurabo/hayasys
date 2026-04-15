from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from django.db.models import Q
from django.utils import timezone

from core.models import (
    BusinessCommunicationThread,
    Schedule,
    Estimate,
)

from core.serializers.dashboard import DashboardSerializer


class DashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):

        user = request.user
        shop = getattr(user, "shop", None)

        # =========================
        # ① 業務連絡
        # =========================
        threads = (
            BusinessCommunicationThread.objects
            .filter(
                Q(messages__sender_shop=shop)
                | Q(messages__receiver_shop=shop)
                | Q(messages__sender_staff=user)
                | Q(messages__receiver_staff=user)
            )
            .distinct()
            .order_by("-updated_at")[:5]
        )

        communication_data = []
        for t in threads:
            last = t.messages.order_by("-created_at").first()

            communication_data.append({
                "id": t.id,
                "title": t.title,
                "customer": t.customer.name if t.customer else None,
                "last_message": last.content if last else None,
                "last_message_at": last.created_at if last else None,
                "is_pending": t.messages.filter(status="pending").exists(),
            })

        # =========================
        # ② スケジュール（今日）
        # =========================
        today = timezone.localdate()

        schedules = (
            Schedule.objects
            .filter(shop=shop, start_at__date=today)
            .order_by("start_at")
        )

        schedule_data = [
            {
                "id": s.id,
                "title": s.title,
                "start_at": s.start_at,
                "customer": s.customer.name if s.customer else None,
                "type": s.schedule_type,
            }
            for s in schedules
        ]

        # =========================
        # ③ 未受注見積
        # =========================
        page = int(request.query_params.get("page", 1))
        page_size = 10

        start = request.query_params.get("start")
        end = request.query_params.get("end")

        estimates = (
            Estimate.objects
            .filter(shop=shop, orders__isnull=True)
            .select_related("party", "created_by")
            .order_by("-created_at")
        )

        if start:
            estimates = estimates.filter(estimate_date__gte=start)
        if end:
            estimates = estimates.filter(estimate_date__lte=end)

        total = estimates.count()

        # ページング
        start_index = (page - 1) * page_size
        end_index = start_index + page_size

        estimates = estimates[start_index:end_index]

        estimate_data = [
            {
                "id": e.id,
                "estimate_no": e.estimate_no,
                "customer": e.party.name if e.party else None,
                "total": e.grand_total,
                "staff": e.created_by.display_name,
                "date": e.estimate_date,
            }
            for e in estimates
        ]

        # =========================
        # Serializer適用（ここが重要）
        # =========================
        data = {
            "communications": communication_data,
            "schedules": schedule_data,
            "estimates": estimate_data,
        }

        serializer = DashboardSerializer(data)

        return Response(serializer.data)