from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator
from PIL import Image
import os
from django.db.models import Q


class Customer(models.Model):
    name = models.CharField(max_length=100)
    kana = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(max_length=255, blank=True, null=True)
    postal_code = models.CharField(max_length=10, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    mobile_phone = models.CharField(max_length=20, blank=True, null=True)
    company = models.CharField(max_length=100, blank=True, null=True)
    company_phone = models.CharField(max_length=20, blank=True, null=True)

    customer_class = models.ForeignKey("core.CustomerClass", on_delete=models.PROTECT, null=True, blank=True)
    staff = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    region = models.ForeignKey("core.Region", on_delete=models.SET_NULL, null=True, blank=True)
    gender = models.ForeignKey("core.Gender", on_delete=models.SET_NULL, null=True, blank=True)
    first_shop = models.ForeignKey("core.Shop", on_delete=models.SET_NULL, null=True, blank=True, related_name="first_customers")
    last_shop = models.ForeignKey("core.Shop", on_delete=models.SET_NULL, null=True, blank=True, related_name="last_customers")

    birthdate = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class CustomerImage(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="customer_images/", validators=[FileExtensionValidator(["jpg", "jpeg", "png", "gif"])])
    mime = models.CharField(max_length=100, blank=True, null=True)
    width = models.IntegerField(blank=True, null=True)
    height = models.IntegerField(blank=True, null=True)
    bytes = models.BigIntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.image:
            try:
                img = Image.open(self.image)
                self.width, self.height = img.size
                self.bytes = self.image.size
                self.mime = Image.MIME.get(img.format, None)
            except Exception:
                pass
        super().save(*args, **kwargs)


class CustomerMemo(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="memos")
    body = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


# ==========================
# 顧客所有車両（CustomerVehicle）
# ==========================
class CustomerVehicle(models.Model):
    customer = models.ForeignKey(
        "core.Customer",
        on_delete=models.CASCADE,
        related_name="customer_vehicles",
    )
    vehicle = models.ForeignKey(
        "core.Vehicle",
        on_delete=models.PROTECT,
        related_name="customer_vehicles",
    )

    # 所有期間
    owned_from = models.DateField(null=True, blank=True)
    owned_to   = models.DateField(null=True, blank=True)

    # 現在所有フラグ
    is_current = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "customer_vehicles"

        # 「同じ車両を同時に2人が所有しない」保証
        constraints = [
            models.UniqueConstraint(
                fields=["vehicle"],
                condition=Q(is_current=True),
                name="uq_vehicle_current_owner",
            )
        ]

        indexes = [
            models.Index(fields=["customer", "is_current"]),
            models.Index(fields=["vehicle", "is_current"]),
            models.Index(fields=["owned_from"]),
            models.Index(fields=["owned_to"]),
        ]

    def __str__(self):
        status = "current" if self.is_current else "past"
        return f"{self.customer_id}-{self.vehicle_id} ({status})"
