from datetime import date
from django.db import transaction, IntegrityError
from django.db.models import Max, IntegerField
from django.db.models.functions import Cast, Substr
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
import jaconv

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
        ).prefetch_related(
            "items",
            "items__product"
        )

        # 店舗
        shop_id = self.request.query_params.get("shop_id")
        if shop_id and shop_id != "all":
            qs = qs.filter(shop_id=shop_id)

        # キーワード検索
        q = self.request.query_params.get("search")
        if q:
            q_norm = jaconv.normalize(q, "NFKC")

            qs = qs.filter(
                Q(estimate_no__icontains=q_norm)
                | Q(party__name__icontains=q_norm)
                | Q(created_by__display_name__icontains=q_norm)
                | Q(items__name__icontains=q_norm)
                | Q(items__product__name__icontains=q_norm)
            ).distinct()

        # 日付範囲
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        # 金額範囲
        amount_min = self.request.query_params.get("amount_min")
        amount_max = self.request.query_params.get("amount_max")

        if amount_min:
            qs = qs.filter(grand_total__gte=amount_min)

        if amount_max:
            qs = qs.filter(grand_total__lte=amount_max)

        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        staff = getattr(user, "staff", None)
        user_shop = getattr(staff, "shop", None)

        # 店舗決定（POST優先）
        # 🔥 0/"" を誤判定しないように「is not None」で判定
        shop_id = self.request.data.get("shop", None)
        if shop_id is not None and shop_id != "":
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
        year_prefix = date.today().strftime("%y")  # 2026 -> 26

        last_number = (
            Estimate.objects
            .filter(estimate_no__startswith=year_prefix)
            .annotate(
                number_part=Cast(
                    Substr("estimate_no", 3, 5),
                    IntegerField(),
                )
            )
            .aggregate(max_number=Max("number_part"))
            .get("max_number")
        )

        next_number = (last_number or 0) + 1
        return f"{year_prefix}{next_number:05d}"


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
        """
        🔥 重要：
        - PUT/PATCHで shop を送らない場合に、勝手に user_shop で上書きしない
        - shop を送ってきた時だけ更新する（未送信なら既存維持）
        """
        staff = getattr(self.request.user, "staff", None)
        user_shop = getattr(staff, "shop", None)

        shop_id = self.request.data.get("shop", None)

        # shop が未送信なら既存維持（上書きしない）
        if shop_id is None:
            serializer.save()
            return

        # shop="" は「未選択」扱い → user_shop に寄せる（nullにしたいなら shop:null を送る）
        if shop_id == "":
            serializer.save(shop=user_shop)
            return

        # shop=null を送ってきたら明示的にnull更新
        if shop_id is None:
            serializer.save(shop=None)
            return

        # shop が送られてきた時だけ解決して更新
        try:
            shop = Shop.objects.get(id=shop_id)
        except Shop.DoesNotExist:
            shop = user_shop

        serializer.save(shop=shop)


# ==================================================
# 次の見積番号取得
# ==================================================
class EstimateNextNoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year_prefix = date.today().strftime("%y")

        last_number = (
            Estimate.objects
            .filter(estimate_no__startswith=year_prefix)
            .annotate(
                number_part=Cast(
                    Substr("estimate_no", 3, 5),
                    IntegerField(),
                )
            )
            .aggregate(max_number=Max("number_part"))
            .get("max_number")
        )

        next_number = (last_number or 0) + 1

        return Response({"next_estimate_no": f"{year_prefix}{next_number:05d}"})


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
            category=item.category,
            manufacturer=item.manufacturer,   # ← 追加
            defaults={
                "unit_price": item.unit_price,
                "tax_type": item.tax_type,
                "is_active": True,
            },
        )

# ==================================================
# 見積明細 取得・更新・削除
# ==================================================
class EstimateItemRetrieveUpdateDestroyAPIView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = EstimateItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        estimate_id = self.kwargs.get("estimate_id")
        return EstimateItem.objects.filter(estimate_id=estimate_id)