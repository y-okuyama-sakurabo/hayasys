from rest_framework import generics, permissions
from django.db.models import Sum
from decimal import Decimal

# 🔹 モデル
from core.models.estimates import Estimate
from core.models.estimates import EstimateItem   # ← これが必要！

# 🔹 シリアライザ
from core.serializers.estimate_items import EstimateItemSerializer  # ← これも必要！


class EstimateItemListCreateAPIView(generics.ListCreateAPIView):
    """
    指定した見積の明細一覧取得・追加
    """
    serializer_class = EstimateItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        estimate_id = self.kwargs["estimate_id"]
        # 🔥 product関連カテゴリを一気に取得して N+1 を防止
        return (
            EstimateItem.objects
            .filter(estimate_id=estimate_id)
            .select_related(
                "product",
                "product__small",
                "product__small__middle",
                "product__small__middle__large",
            )
        )

    def perform_create(self, serializer):
        estimate_id = self.kwargs["estimate_id"]
        estimate = Estimate.objects.get(id=estimate_id)
        serializer.save(estimate=estimate)
        self.update_estimate_totals(estimate_id)

    def update_estimate_totals(self, estimate_id):
        """
        明細から見積合計を再計算
        """
        items = EstimateItem.objects.filter(estimate_id=estimate_id)
        subtotal = items.aggregate(total=Sum("subtotal"))["total"] or Decimal("0")
        tax_total = items.filter(tax_type="taxable").aggregate(total=Sum("subtotal"))["total"] or Decimal("0")
        grand_total = subtotal

        tax_rate = Decimal("0.1")
        Estimate.objects.filter(id=estimate_id).update(
            subtotal=subtotal,
            tax_total=tax_total * tax_rate,
            grand_total=grand_total + (tax_total * tax_rate),
        )


class EstimateItemRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    明細の取得・更新・削除
    """
    serializer_class = EstimateItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 🔥 ここでも product関連をまとめて取得
        return EstimateItem.objects.select_related(
            "product",
            "product__small",
            "product__small__middle",
            "product__small__middle__large",
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
        subtotal = items.aggregate(total=Sum("subtotal"))["total"] or Decimal("0")
        tax_total = items.filter(tax_type="taxable").aggregate(total=Sum("subtotal"))["total"] or Decimal("0")
        grand_total = subtotal

        tax_rate = Decimal("0.1")
        Estimate.objects.filter(id=estimate_id).update(
            subtotal=subtotal,
            tax_total=tax_total * tax_rate,
            grand_total=grand_total + (tax_total * tax_rate),
        )
