# core/models/business_communication_thread.py

from django.db import models
from django.conf import settings


class BusinessCommunicationThread(models.Model):

    customer = models.ForeignKey(
        "core.Customer",
        on_delete=models.CASCADE,
        related_name="communication_threads",
        verbose_name="顧客",
    )

    title = models.CharField(
        max_length=200,
        verbose_name="スレッドタイトル",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_communication_threads",
        verbose_name="作成者",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時",
    )

    class Meta:
        db_table = "business_communication_threads"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.customer} - {self.title}"