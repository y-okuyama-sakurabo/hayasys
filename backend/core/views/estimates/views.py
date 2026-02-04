from datetime import date
from django.db import transaction, IntegrityError
from django.db.models import Max, IntegerField
from django.db.models.functions import Cast, Substr
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, serializers
from rest_framework.views import APIView
from rest_framework.response import Response

from core.models import Estimate, EstimateItem, Product
from core.models.base import Shop
from core.serializers.estimates import (
    EstimateSerializer,
    EstimateDetailSerializer,
    EstimateItemSerializer,
)


# ==================================================
# 見積一覧・作成
# ==================================================
class EstimateListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = EstimateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Estimate.objects.select_related(
            "party",
            "shop",
            "created_by",
        )

        shop_id = self.request.query_params.get("shop_id")
        if shop_id and shop_id != "all":
            qs = qs.filter(shop_id=shop_id)

        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        staff = getattr(user, "staff", None)
        user_shop = getattr(staff, "shop", None)

        # 店舗決定（POST優先）
        shop_id = self.request.data.get("shop")
        if shop_id:
            try:
                shop = Shop.objects.get(id=shop_id)
            except Shop.DoesNotExist:
                shop = user_shop
        else:
            shop = user_shop

        # 見積番号自動採番
        estimate_no = serializer.validated_data.get("estimate_no")
        if not estimate_no or Estimate.objects.filter(estimate_no=estimate_no).exists():
            estimate_no = self._generate_next_estimate_no()

        try:
            with transaction.atomic():
                serializer.save(
                    created_by=user,
                    shop=shop,
                    estimate_no=estimate_no,
                )
        except IntegrityError as e:
            raise serializers.ValidationError({"detail": str(e)})

    def _generate_next_estimate_no(self):
        today_str = date.today().strftime("%Y%m%d")
        last_number = (
            Estimate.objects
            .filter(estimate_no__startswith=today_str)
            .annotate(
                number_part=Cast(
                    Substr("estimate_no", len(today_str) + 2, 10),
                    IntegerField(),
                )
            )
            .aggregate(max_number=Max("number_part"))
            .get("max_number")
        )
        next_number = (last_number or 0) + 1
        return f"{today_str}-{next_number}"


# ==================================================
# 見積取得・更新・削除
# ==================================================
class EstimateRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    queryset = (
        Estimate.objects
        .select_related(
            "party",
            "shop",
            "created_by",
            "party__customer_class",
            "party__region",
            "party__gender",
        )
        .prefetch_related(
            "items",
            "items__category",
        )
    )

    def get_serializer_class(self):
        if self.request.method == "GET":
            return EstimateDetailSerializer
        return EstimateSerializer

    def perform_update(self, serializer):
        staff = getattr(self.request.user, "staff", None)
        user_shop = getattr(staff, "shop", None)

        shop_id = self.request.data.get("shop")
        if shop_id:
            try:
                shop = Shop.objects.get(id=shop_id)
            except Shop.DoesNotExist:
                shop = user_shop
        else:
            shop = user_shop

        serializer.save(shop=shop)


# ==================================================
# 次の見積番号取得
# ==================================================
class EstimateNextNoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today_str = date.today().strftime("%Y%m%d")
        last_estimate = (
            Estimate.objects
            .filter(estimate_no__startswith=today_str)
            .aggregate(Max("estimate_no"))
            .get("estimate_no__max")
        )

        if last_estimate:
            try:
                last_number = int(last_estimate.split("-")[1])
            except (IndexError, ValueError):
                last_number = 0
            next_number = last_number + 1
        else:
            next_number = 1

        return Response({"next_estimate_no": f"{today_str}-{next_number}"})


# ==================================================
# 見積明細一覧・作成（★ここが重要）
# ==================================================
class EstimateItemListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = EstimateItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        estimate_id = self.kwargs.get("estimate_id")
        return EstimateItem.objects.filter(estimate_id=estimate_id)

    @transaction.atomic
    def perform_create(self, serializer):
        estimate_id = self.kwargs.get("estimate_id")
        estimate = get_object_or_404(Estimate, id=estimate_id)

        item = serializer.save(estimate=estimate)

        # UI意思フラグ（Boolean保証）
        save_flag = serializer.validated_data.get("saveAsProduct", False)
        self._create_product_if_needed(item, save_flag)

    def _create_product_if_needed(self, item: EstimateItem, save_flag: bool):
        if not save_flag:
            return

        if not item.name or not item.category_id:
            return

        Product.objects.get_or_create(
            name=item.name,
            category_id=item.category_id,
            defaults={
                "unit_price": item.unit_price,
                "tax_type": item.tax_type,
                "is_active": True,
            },
        )
