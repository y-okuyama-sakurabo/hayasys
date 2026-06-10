# core/models/payment_company.py
from django.db import models


class PaymentCompany(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ("loan", "ローン"),
        ("card", "カード"),
        ("qr",   "QR決済"),
    ]

    name         = models.CharField("会社名", max_length=100)
    payment_type = models.CharField("支払種別", max_length=20, choices=PAYMENT_TYPE_CHOICES)
    sort_order   = models.PositiveIntegerField("表示順", default=0)
    is_active    = models.BooleanField("有効", default=True)

    class Meta:
        db_table = "payment_companies"
        ordering = ["payment_type", "sort_order", "id"]

    def __str__(self):
        return f"{self.get_payment_type_display()} / {self.name}"
