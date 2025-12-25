from datetime import date
from django.db import transaction, IntegrityError
from django.db.models import Max, IntegerField
from django.db.models.functions import Cast, Substr
from rest_framework import generics, permissions, serializers
from rest_framework.views import APIView
from rest_framework.response import Response

from core.models import Estimate, EstimateParty
from core.models.base import Shop
from core.serializers.estimates import EstimateSerializer, EstimateDetailSerializer


class EstimateListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = EstimateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        店舗ID(shop_id)指定があれば、その店舗の見積のみを返す。
        """
        qs = Estimate.objects.all().select_related("party", "shop", "created_by")

        shop_id = self.request.query_params.get("shop_id")
        if shop_id and shop_id != "all":
            qs = qs.filter(shop_id=shop_id)

        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        staff = getattr(user, "staff", None)
        user_shop = getattr(staff, "shop", None)

        # 🔹 店舗設定（POSTデータ or ユーザー所属）
        shop_id = self.request.data.get("shop")
        if shop_id:
            try:
                shop = Shop.objects.get(id=shop_id)
            except Shop.DoesNotExist:
                shop = user_shop
        else:
            shop = user_shop

        # 🔹 見積番号を自動採番（重複防止含む）
        estimate_no = serializer.validated_data.get("estimate_no")
        if not estimate_no or Estimate.objects.filter(estimate_no=estimate_no).exists():
            estimate_no = self._generate_next_estimate_no()

        # ✅ ログイン中のユーザーを created_by にセットして保存
        try:
            with transaction.atomic():
                serializer.save(
                    created_by=user,   # ← ここが重要
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
                    IntegerField()
                )
            )
            .aggregate(max_number=Max("number_part"))
            .get("max_number")
        )
        next_number = (last_number or 0) + 1
        return f"{today_str}-{next_number}"


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
            "items__product",
            "items__product__small",
            "items__product__small__middle",
            "items__product__small__middle__large",
        )
    )

    def get_serializer_class(self):
        if self.request.method == "GET":
            return EstimateDetailSerializer
        return EstimateSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

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

class EstimateNextNoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """次の見積番号を返す"""
        today_str = date.today().strftime("%Y%m%d")
        last_estimate = (
            Estimate.objects.filter(estimate_no__startswith=today_str)
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

        next_no = f"{today_str}-{next_number}"
        return Response({"next_estimate_no": next_no})
