from django.db import models


class OrderSettlement(models.Model):
    order = models.ForeignKey(
        "core.Order",
        on_delete=models.CASCADE,
        related_name="settlements"
    )

    settlement_type = models.CharField(
        max_length=30,
        choices=[
            ("trade_in", "下取車"),
            ("cash", "現金"),
            ("card", "カード・クーポン"),
            ("credit", "クレジット"),
            ("advance", "前受金"),
        ]
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        default=0
    )