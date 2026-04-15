# core/models/business_communication.py

from django.db import models
from django.conf import settings


class BusinessCommunication(models.Model):

    thread = models.ForeignKey(
        "core.BusinessCommunicationThread",
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="スレッド",
        null=True,
        blank=True,
    )

    customer = models.ForeignKey(
        "core.Customer",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="business_communications",
        verbose_name="顧客",
    )

    # ==============================
    # 送信元
    # ==============================

    sender_shop = models.ForeignKey(
        "core.Shop",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sent_business_communications",
        verbose_name="送信元店舗",
    )

    sender_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="sent_staff_business_communications",
        verbose_name="送信元スタッフ",
    )

    # ==============================
    # 送信先
    # ==============================

    receiver_shop = models.ForeignKey(
        "core.Shop",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="received_business_communications",
        verbose_name="送信先店舗",
    )

    receiver_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="received_staff_business_communications",
        verbose_name="送信先スタッフ",
    )

    # ==============================
    # 内容
    # ==============================

    content = models.TextField(
        verbose_name="内容",
    )

    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "未対応"),
            ("done", "対応済み"),
        ],
        default="pending",
        verbose_name="対応状況",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_business_communications",
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
        db_table = "business_communications"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.thread_id} - {self.content[:30]}"