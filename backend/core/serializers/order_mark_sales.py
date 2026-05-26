from rest_framework import serializers
from core.models import Order


class MarkSalesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["sales_date"]  # sales_date は返却用、入力不要
        read_only_fields = ["sales_date"]

    def update(self, instance, validated_data):
        """
        売上計上ロジック：
        - 納品が完了していないとエラー（入金状況は問わない）
        - sales_date は納品完了日で自動決定
        - status を sales_completed に更新
        """

        final_delivery = instance.final_delivery_date

        # --- チェック ---
        if not final_delivery:
            raise serializers.ValidationError({"detail": "納品が完了していません"})

        # --- 売上日 = 納品完了日 ---
        instance.sales_date   = final_delivery
        instance.status       = "sales_completed"

        instance.save(update_fields=["sales_date", "status"])

        return instance
