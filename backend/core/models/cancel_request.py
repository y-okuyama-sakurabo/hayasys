from django.db import models


class CancelRequest(models.Model):
    STATUS_CHOICES = [
        ("pending",  "申請中"),
        ("approved", "承認済"),
        ("rejected", "却下"),
    ]

    order = models.ForeignKey(
        "core.Order",
        on_delete=models.CASCADE,
        related_name="cancel_requests",
        verbose_name="受注",
    )
    requested_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="submitted_cancel_requests",
        verbose_name="申請者",
    )
    reason = models.TextField("キャンセル理由")
    status = models.CharField(
        "ステータス", max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    reviewed_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_cancel_requests",
        verbose_name="承認者",
    )
    reviewed_at = models.DateTimeField("処理日時", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cancel_requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"CancelRequest #{self.id} order={self.order_id} [{self.status}]"
