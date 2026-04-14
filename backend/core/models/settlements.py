from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey


class Settlement(models.Model):
    """支払い内訳（見積・受注共通）"""

    SETTLEMENT_TYPE_CHOICES = [
        ("trade_in", "下取車"),
        ("cash", "現金"),
        ("card", "カード・クーポン"),
        ("credit", "クレジット"),
        ("advance", "前受金"),
    ]

    # 汎用紐付け（Estimate / Order 両対応）
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    settlement_type = models.CharField(max_length=30, choices=SETTLEMENT_TYPE_CHOICES)

    amount = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "settlements"