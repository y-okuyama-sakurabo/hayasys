# core/models/insurance.py

from django.db import models
from core.models import Estimate, Order


class Insurance(models.Model):
    estimate = models.OneToOneField(
        Estimate,
        on_delete=models.CASCADE,
        related_name="insurance",
        null=True,
        blank=True,
    )

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="insurance",
        null=True,
        blank=True,
    )

    # =========================
    # 任意保険項目
    # =========================
    company_name = models.CharField(max_length=255, blank=True)

    bodily_injury = models.CharField(max_length=50, blank=True)   # 対人
    property_damage = models.CharField(max_length=50, blank=True) # 対物
    passenger = models.CharField(max_length=50, blank=True)       # 搭乗者
    vehicle = models.CharField(max_length=50, blank=True)         # 車両
    option = models.TextField(blank=True)                         # オプション

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)