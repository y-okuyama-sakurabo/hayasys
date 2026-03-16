# core/models/business_communication_attachments.py

from django.db import models


class BusinessCommunicationAttachment(models.Model):

    communication = models.ForeignKey(
        "core.BusinessCommunication",
        on_delete=models.CASCADE,
        related_name="attachments",
        verbose_name="業務連絡",
    )

    file = models.ImageField(
        upload_to="business_communications/",
        verbose_name="ファイル",
    )

    mime = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="MIMEタイプ",
    )

    bytes = models.PositiveIntegerField(
        default=0,
        verbose_name="ファイルサイズ",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時",
    )

    class Meta:
        db_table = "business_communication_attachments"

    def __str__(self):
        return str(self.file)