from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericRelation
from core.models.payments import Payment

class OrderStatus(models.TextChoices):
    DRAFT = "draft", "下書き"
    ORDERED = "ordered", "受注確定"
    CANCELLED = "cancelled", "キャンセル"
    DELIVERED = "delivered", "納車済"

class Order(models.Model):
    order_no = models.CharField(max_length=20, unique=True)
    shop = models.ForeignKey("core.Shop", on_delete=models.SET_NULL, null=True, blank=True)

    # 受注元見積（必須ではない）
    estimate = models.ForeignKey(
        "core.Estimate",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="orders"
    )

    # 顧客（Customer へ昇格済み）
    customer = models.ForeignKey(
        "core.Customer",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="orders"
    )

    # 受注時点の顧客情報スナップショット（変更されない）
    party_name = models.CharField(max_length=100)
    party_kana = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(max_length=255, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)

    status = models.CharField(max_length=20, choices=OrderStatus.choices, default="ordered")
    order_date = models.DateField(null=True, blank=True)
    DELIVERY_STATUS_CHOICES = [
        ("not_delivered", "未納品"),
        ("partial", "一部納品"),
        ("delivered", "納品済"),
    ]

    delivery_status = models.CharField(
        max_length=20,
        choices=DELIVERY_STATUS_CHOICES,
        default="not_delivered",
    )
    final_delivery_date = models.DateField(null=True, blank=True)
    final_payment_date = models.DateField(null=True, blank=True)
    sales_date = models.DateField(null=True, blank=True)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    payments = GenericRelation(Payment, related_query_name="order")

    # 作成者（スタッフ）
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_orders",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_no

class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items"
    )
    product = models.ForeignKey(
        "core.Product",
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name="order_items"
    )
    name = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_type = models.CharField(
        max_length=20,
        choices=[("taxable", "課税"), ("non_taxable", "非課税")],
        default="taxable"
    )
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    delivery_status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "未納品"),
            ("delivered", "納品済"),
        ],
        default="pending"
    )

    delivery_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "order_items"
        ordering = ["id"]