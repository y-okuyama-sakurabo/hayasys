from django.db import models
from core.models import Order


class Sales(models.Model):
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="sales"
    )

    # 売上日（手動 or 自動）
    sales_date = models.DateField()

    # 売上金額
    sales_amount = models.DecimalField(max_digits=10, decimal_places=2)

    # 自動 or 手動
    sales_type = models.CharField(
        max_length=20,
        choices=[
            ("auto", "自動計上"),
            ("manual", "手動計上"),
        ],
        default="manual"
    )

    memo = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Sales #{self.id} (Order {self.order_id})"
