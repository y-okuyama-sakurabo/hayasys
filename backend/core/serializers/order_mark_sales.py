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
        - final_delivery_date と final_payment_date が揃っていないとエラー
        - sales_date は「遅いほうの日付」で自動決定
        - status を sales_completed に更新
        """

        final_delivery = instance.final_delivery_date
        final_payment = instance.final_payment_date

        # --- チェック ---
        if not final_delivery:
            raise serializers.ValidationError({"detail": "納品が完了していません"})

        if not final_payment:
            raise serializers.ValidationError({"detail": "入金が完了していません"})

        # --- 売上日 = 納品完了日 or 入金完了日の遅い方 ---
        sales_date = max(final_delivery, final_payment)

        instance.sales_date = sales_date
        instance.status = "sales_completed"  # 必要であれば OrderStatus に追加しても良い

        instance.save(update_fields=["sales_date", "status"])

        return instance
