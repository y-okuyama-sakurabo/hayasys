from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from core.models import Order
from core.serializers.order_management_list import OrderManagementListSerializer


class OrderManagementListAPIView(generics.ListAPIView):
    serializer_class = OrderManagementListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            Order.objects.all()
            .select_related("payment_management", "shop")
            .prefetch_related(
                "deliveries__items",
                "items"
            )
            .order_by("-order_date")
        )

        # ===== 店舗フィルタリング（★追加） =====
        shop_id = self.request.GET.get("shop_id")
        if shop_id not in [None, "", "all"]:
            try:
                qs = qs.filter(shop_id=int(shop_id))
            except ValueError:
                pass

        # ===== 検索パラメータ =====
        customer = self.request.GET.get("customer")
        status = self.request.GET.get("status")
        order_from = self.request.GET.get("from")
        order_to = self.request.GET.get("to")

        if customer:
            qs = qs.filter(party_name__icontains=customer)

        if status == "unpaid":
            qs = qs.filter(payment_management__records__isnull=True)

        if order_from:
            qs = qs.filter(order_date__gte=order_from)

        if order_to:
            qs = qs.filter(order_date__lte=order_to)

        return qs
