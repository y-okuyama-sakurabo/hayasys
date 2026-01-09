# core/models/business_communication_attachments.py
from django.db import models

class BusinessCommunicationAttachment(models.Model):
    communication = models.ForeignKey(
        "core.BusinessCommunication",
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.ImageField(upload_to="business_communications/")
    mime = models.CharField(max_length=100, blank=True)
    bytes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "business_communication_attachments"
