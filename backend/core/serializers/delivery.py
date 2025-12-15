from django.db import models

from rest_framework import serializers
from core.models.order_delivery_payment import Delivery, DeliveryItem
from core.models import Order, OrderItem



class DeliveryItemSerializer(serializers.ModelSerializer):
    # ---- POST 用（write） ----
    order_item_id = serializers.PrimaryKeyRelatedField(
        queryset=OrderItem.objects.all(),
        source="order_item",
        write_only=True,
    )

    # ---- GET 用（read） ----
    order_item = serializers.PrimaryKeyRelatedField(read_only=True)
    order_item_name = serializers.CharField(
        source="order_item.name",
        read_only=True
    )

    class Meta:
        model = DeliveryItem
        fields = [
            "id",
            "order_item_id",
            "order_item",
            "order_item_name",
            "quantity",
        ]


class DeliverySerializer(serializers.ModelSerializer):
    items = DeliveryItemSerializer(many=True)

    class Meta:
        model = Delivery
        fields = ["id", "order", "delivery_date", "notes", "delivery_status", "items"]
        read_only_fields = ["order", "delivery_status"]

    def validate(self, data):
        items = data.get("items", [])

        cleaned = []
        for item in items:
            oi = item.get("order_item")
            qty = item.get("quantity")

            if oi is None:
                continue

            if not qty or qty == 0:
                continue

            cleaned.append(item)

        if len(cleaned) == 0:
            raise serializers.ValidationError("納品対象の商品が選択されていません。")

        data["items"] = cleaned
        return data

    # =======================================================
    # 🔥 create（新規納品）
    # =======================================================
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        order = self.context["order"]

        delivery = Delivery.objects.create(order=order, **validated_data)

        for item in items_data:
            di = DeliveryItem.objects.create(delivery=delivery, **item)

            # OrderItem の状態更新
            oi = di.order_item
            oi.delivery_status = "delivered"
            oi.delivery_date = delivery.delivery_date
            oi.save(update_fields=["delivery_status", "delivery_date"])

        delivery.update_status()
        return delivery

    # =======================================================
    # 🔥 update（納品内容の変更）
    # =======================================================
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", [])

        # 納品日・備考の更新
        instance.delivery_date = validated_data.get("delivery_date", instance.delivery_date)
        instance.notes = validated_data.get("notes", instance.notes)
        instance.save()

        # ----------------------------
        # 旧 DeliveryItem の OrderItem 状態をリセット
        # ----------------------------
        old_items = list(instance.items.all())
        for old_di in old_items:
            oi = old_di.order_item
            oi.delivery_status = "pending"
            oi.delivery_date = None
            oi.save(update_fields=["delivery_status", "delivery_date"])

        # DeliveryItem をすべて削除して再作成
        instance.items.all().delete()

        # ----------------------------
        # 新しい DeliveryItem を作成し直す
        # ----------------------------
        for item in items_data:
            di = DeliveryItem.objects.create(delivery=instance, **item)

            # OrderItem を delivered に更新
            oi = di.order_item
            oi.delivery_status = "delivered"
            oi.delivery_date = instance.delivery_date
            oi.save(update_fields=["delivery_status", "delivery_date"])

        # Order 全体の納品ステータス更新
        instance.update_status()
        return instance


