from django.db import models
from django.conf import settings


class BusinessCommunication(models.Model):
    customer = models.ForeignKey("core.Customer", on_delete=models.CASCADE)
    sender_shop = models.ForeignKey("core.Shop", on_delete=models.PROTECT, related_name="sent_business_communications")
    receiver_shop = models.ForeignKey("core.Shop", on_delete=models.PROTECT, related_name="received_business_communications")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_business_communications"
    )
    title = models.CharField(max_length=100)
    content = models.TextField()
    status = models.CharField(max_length=20, choices=[("pending", "未対応"), ("done", "対応済み")], default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
