# core/models/payment.py
from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

class Payment(models.Model):
    """クレジット情報専用"""

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    # クレジット専用
    credit_company = models.CharField(max_length=100)
    credit_first_payment = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    credit_second_payment = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    credit_bonus_payment = models.DecimalField(max_digits=10, decimal_places=0, null=True, blank=True)
    credit_installments = models.IntegerField(null=True, blank=True)
    credit_start_month = models.CharField(max_length=7, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
