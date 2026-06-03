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
from core.services.audit import write_audit_log


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

        # 日付範囲（estimate_date 基準。未設定の場合は created_at で補完）
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if date_from:
            qs = qs.filter(estimate_date__gte=date_from)

        if date_to:
            qs = qs.filter(estimate_date__lte=date_to)

        # 金額範囲
        amount_min = self.request.query_params.get("amount_min")
        amount_max = self.request.query_params.get("amount_max")

        if amount_min:
            qs = qs.filter(grand_total__gte=amount_min)

        if amount_max:
            qs = qs.filter(grand_total__lte=amount_max)

        # ステータス
        status_param = self.request.query_params.get("status")
        if status_param and status_param != "all":
            qs = qs.filter(status=status_param)

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
                estimate = serializer.save(
                    created_by=user,
                    shop=shop,
                    estimate_no=estimate_no,
                )
        except IntegrityError as e:
            raise serializers.ValidationError({"detail": str(e)})

        try:
            write_audit_log(
                request=self.request,
                action="estimate.create",
                target_type="estimate",
                target_id=estimate.id,
                summary=f"見積 #{estimate.estimate_no} を作成しました",
            )
        except Exception:
            pass

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
        - shop を送らない場合は既存の値を維持（上書きしない）
        - shop="" は未選択扱い → ユーザーの所属店舗にフォールバック
        - shop=<id> は指定店舗に更新
        items / vehicles_payload を含む一括更新をアトミックに処理する。
        """
        staff = getattr(self.request.user, "staff", None)
        user_shop = getattr(staff, "shop", None)

        shop_id = self.request.data.get("shop", None)

        with transaction.atomic():
            if shop_id is None:
                estimate = serializer.save()
            elif shop_id == "":
                estimate = serializer.save(shop=user_shop)
            else:
                try:
                    shop = Shop.objects.get(id=shop_id)
                except Shop.DoesNotExist:
                    shop = user_shop
                estimate = serializer.save(shop=shop)

        try:
            write_audit_log(
                request=self.request,
                action="estimate.update",
                target_type="estimate",
                target_id=estimate.id,
                summary=f"見積 #{estimate.estimate_no} を更新しました",
            )
        except Exception:
            pass

    def perform_destroy(self, instance):
        no = instance.estimate_no
        eid = instance.id
        instance.delete()
        try:
            write_audit_log(
                request=self.request,
                action="estimate.delete",
                target_type="estimate",
                target_id=eid,
                summary=f"見積 #{no} を削除しました",
            )
        except Exception:
            pass


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


# ==================================================
# 見積ステータス更新
# ==================================================
class EstimateStatusUpdateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    VALID_TRANSITIONS = {
        "draft": {"issued"},
        "issued": {"draft", "ordered"},
        "ordered": {"issued"},
    }

    def patch(self, request, pk):
        estimate = get_object_or_404(Estimate, pk=pk)
        new_status = request.data.get("status")

        allowed = self.VALID_TRANSITIONS.get(estimate.status, set())
        if new_status not in allowed:
            return Response(
                {"detail": f"'{estimate.status}' から '{new_status}' への変更はできません"},
                status=400,
            )

        old_status_display = estimate.get_status_display()
        estimate.status = new_status
        estimate.save(update_fields=["status"])

        try:
            write_audit_log(
                request=request,
                action="estimate.status_change",
                target_type="estimate",
                target_id=estimate.id,
                summary=f"見積 #{estimate.estimate_no} のステータスを「{old_status_display}」→「{estimate.get_status_display()}」に変更しました",
            )
        except Exception:
            pass

        return Response({
            "status": estimate.status,
            "status_display": estimate.get_status_display(),
        })