from django.db import models
from django.db.models import Sum


class Delivery(models.Model):
    order = models.ForeignKey(
        "core.Order",
        on_delete=models.CASCADE,
        related_name="deliveries"
    )

    delivery_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    # Delivery 自体のステータス（個々の納品レコード用）
    delivery_status = models.CharField(
        max_length=20,
        default="pending"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Delivery #{self.id} (Order {self.order_id})"

    # ============================================================
    #  Order 全体の納品状況を自動計算し、Order に反映する
    # ============================================================
    def update_status(self):
        order = self.order
        all_items = order.items.all()

        total_items = all_items.count()
        completed = 0
        partial = 0

        delivered_dates = []  # itemごとの最終納品日

        for oi in all_items:
            ordered_qty = oi.quantity

            delivered_qty = DeliveryItem.objects.filter(
                order_item=oi
            ).aggregate(total=Sum("quantity"))["total"] or 0

            # itemの納品日（最大値）
            item_dates = DeliveryItem.objects.filter(
                order_item=oi
            ).values_list("delivery__delivery_date", flat=True)

            if item_dates:
                delivered_dates.append(max(item_dates))

            # ステータス判定
            if delivered_qty == 0:
                # 未納品
                continue
            elif delivered_qty < ordered_qty:
                # 部分納品
                partial += 1
            else:
                # すべて納品完了
                completed += 1

        # ---------------------------------------
        #  Order.delivery_status の判定
        # ---------------------------------------
        if total_items == 0:
            status = "not_delivered"
        elif completed == total_items:
            status = "delivered"
        elif partial > 0 or completed > 0:
            status = "partial"
        else:
            status = "not_delivered"

        order.delivery_status = status

        # ---------------------------------------
        #  final_delivery_date の決定
        # ---------------------------------------
        if status == "delivered" and delivered_dates:
            order.final_delivery_date = max(delivered_dates)
        else:
            order.final_delivery_date = None

        order.save(update_fields=["delivery_status", "final_delivery_date"])

        return status


# ==================================================
# DeliveryItem（納品明細）
# ==================================================
class DeliveryItem(models.Model):
    delivery = models.ForeignKey(
        "core.Delivery",
        on_delete=models.CASCADE,
        related_name="items"
    )
    order_item = models.ForeignKey(
        "core.OrderItem",
        on_delete=models.PROTECT
    )

    quantity = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.order_item.name} - {self.quantity}"


# ==================================================
# 支払い管理 (1:1)
# ==================================================
class PaymentManagement(models.Model):
    order = models.OneToOneField(
        "core.Order",
        on_delete=models.CASCADE,
        related_name="payment_management"
    )

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PaymentManagement #{self.id} (Order {self.order_id})"
    
    def update_final_payment_date(self):
        """全額入金されている場合は final_payment_date を更新"""
        records = self.records.all()
        if not records.exists():
            self.order.final_payment_date = None
            self.order.save(update_fields=["final_payment_date"])
            return

        total_paid = sum(r.amount for r in records)

        if total_paid < self.order.grand_total:
            # 未完了
            self.order.final_payment_date = None
        else:
            # 完了 → 最も遅い入金日を入金完了日とする
            latest_date = max(r.payment_date for r in records)
            self.order.final_payment_date = latest_date

        self.order.save(update_fields=["final_payment_date"])


# ==================================================
# 支払いレコード (複数)
# ==================================================
class PaymentRecord(models.Model):
    payment_management = models.ForeignKey(
        PaymentManagement,
        on_delete=models.CASCADE,
        related_name="records"
    )

    amount = models.DecimalField(max_digits=10, decimal_places=0)
    payment_date = models.DateField()
    method = models.CharField(max_length=20)
    company = models.ForeignKey(
        "core.PaymentCompany",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_records",
        verbose_name="支払会社",
    )
    memo = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.amount} on {self.payment_date}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.payment_management.update_final_payment_date()

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        self.payment_management.update_final_payment_date()
