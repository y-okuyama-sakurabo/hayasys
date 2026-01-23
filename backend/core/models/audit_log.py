from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    # 誰が
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="audit_logs",
    )
    # どの店舗スコープで（User.shop ベース）
    shop = models.ForeignKey(
        "core.Shop",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="audit_logs",
    )

    # 何をした（例: "customer.update", "order.confirm"）
    action = models.CharField(max_length=60)

    # どの対象に（最小は type + id）
    target_type = models.CharField(max_length=60, blank=True)
    target_id = models.BigIntegerField(null=True, blank=True)

    # 表示用
    summary = models.CharField(max_length=255, blank=True)

    # 変更差分（最初は空でもOK）
    diff = models.JSONField(null=True, blank=True)

    # 付帯情報
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["shop", "created_at"]),
            models.Index(fields=["actor", "created_at"]),
            models.Index(fields=["target_type", "target_id", "created_at"]),
            models.Index(fields=["action", "created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.created_at} {self.action} by {self.actor_id}"
