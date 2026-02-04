from rest_framework import generics, permissions
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from decimal import Decimal

from core.models.estimates import Estimate, EstimateItem
from core.serializers.estimate_items import EstimateItemSerializer


# ==================================================
# 見積明細一覧・作成
# ==================================================
class EstimateItemListCreateAPIView(generics.ListCreateAPIView):
    """
    指定した見積の明細一覧取得・追加
    """
    serializer_class = EstimateItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        estimate_id = self.kwargs["estimate_id"]
        return (
            EstimateItem.objects
            .filter(estimate_id=estimate_id)
            .select_related(
                "category",
                "category__parent",
                "category__parent__parent",
                "category__parent__parent__parent",
            )
            .order_by("id")
        )

    def perform_create(self, serializer):
        estimate = get_object_or_404(
            Estimate,
            id=self.kwargs["estimate_id"],
        )

        # 🔹 明細保存（Product 登録などは serializer 側に委譲）
        serializer.save(estimate=estimate)

        # 🔹 見積金額再計算
        self.update_estimate_totals(estimate.id)

    def update_estimate_totals(self, estimate_id):
        """明細から見積合計を再計算"""
        items = EstimateItem.objects.filter(estimate_id=estimate_id)

        subtotal = (
            items.aggregate(total=Sum("subtotal"))["total"]
            or Decimal("0")
        )

        taxable = (
            items.filter(tax_type="taxable")
            .aggregate(total=Sum("subtotal"))["total"]
            or Decimal("0")
        )

        tax_rate = Decimal("0.1")
        tax_total = taxable * tax_rate
        grand_total = subtotal + tax_total

        Estimate.objects.filter(id=estimate_id).update(
            subtotal=subtotal,
            tax_total=tax_total,
            grand_total=grand_total,
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
        return (
            EstimateItem.objects
            .select_related("category")
            .order_by("id")
        )

    def perform_update(self, serializer):
        item = serializer.save()
        self.update_estimate_totals(item.estimate_id)

    def perform_destroy(self, instance):
        estimate_id = instance.estimate_id
        instance.delete()
        self.update_estimate_totals(estimate_id)

    def update_estimate_totals(self, estimate_id):
        items = EstimateItem.objects.filter(estimate_id=estimate_id)

        subtotal = (
            items.aggregate(total=Sum("subtotal"))["total"]
            or Decimal("0")
        )

        taxable = (
            items.filter(tax_type="taxable")
            .aggregate(total=Sum("subtotal"))["total"]
            or Decimal("0")
        )

        tax_rate = Decimal("0.1")
        tax_total = taxable * tax_rate
        grand_total = subtotal + tax_total

        Estimate.objects.filter(id=estimate_id).update(
            subtotal=subtotal,
            tax_total=tax_total,
            grand_total=grand_total,
        )
