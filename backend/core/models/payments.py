# core/models/payment.py
from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

class Payment(models.Model):
    """見積・受注・契約など、あらゆるフェーズに紐づく共通支払い情報"""

    PAYMENT_METHOD_CHOICES = [
        ("現金", "現金"),
        ("クレジット", "クレジット"),
        ("請求書", "請求書"),
    ]

    # 汎用的に他モデルへ紐づけ（Generic ForeignKey）
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

      # 🧾 支払い関連フィールド（シンプル化）
    payment_method = models.CharField(max_length=20, default="現金")

    # クレジット専用項目
    credit_company = models.CharField(max_length=100, null=True, blank=True)
    credit_first_payment = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    credit_second_payment = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    credit_bonus_payment = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    credit_installments = models.IntegerField(null=True, blank=True)
    credit_start_month = models.CharField(max_length=7, null=True, blank=True)  # 例: "2025-04"

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments"
        verbose_name = "支払い情報"
        verbose_name_plural = "支払い情報"

    def __str__(self):
        return f"{self.payment_method} ({self.deposit_amount or 0}円)"
