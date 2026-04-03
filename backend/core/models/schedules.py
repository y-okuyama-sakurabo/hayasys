from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class Schedule(models.Model):
    schedule_type = models.CharField(
        max_length=20,
        choices=[
            ("delivery", "納車"),
            ("free", "フリー"),
        ],
        default="free",
    )

    order = models.ForeignKey(
        "core.Order",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="schedules",
    )
    
    estimate = models.ForeignKey(
        "core.Estimate",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="schedules",
    )

    customer = models.ForeignKey(
        "core.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="schedules",
    )

    shop = models.ForeignKey(
        "core.Shop",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)

    delivery_method = models.CharField(max_length=50, blank=True)

    delivery_shop = models.ForeignKey(
        "core.Shop",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="delivery_schedules",
    )

    is_completed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title