from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator
from PIL import Image
import os
from django.db.models.signals import post_delete
from django.dispatch import receiver


# ==========================
# 車両基本情報
# ==========================
class Vehicle(models.Model):
    vehicle_name = models.CharField(max_length=100, blank=True)
    displacement = models.IntegerField(null=True, blank=True)
    model_year = models.CharField(max_length=10, blank=True)
    new_car_type = models.CharField(max_length=20, blank=True)  # new / used
    manufacturer = models.ForeignKey(
        "core.Manufacturer", on_delete=models.PROTECT, null=True, blank=True
    )
    category = models.ForeignKey(
        "core.VehicleCategory", on_delete=models.PROTECT, null=True, blank=True
    )
    color = models.ForeignKey(
        "core.Color", on_delete=models.SET_NULL, null=True, blank=True
    )
    model_code = models.CharField(max_length=50, blank=True)
    chassis_no = models.CharField(max_length=50, blank=True, null=True, unique=True)
    color_name = models.CharField(max_length=50, blank=True)
    color_code = models.CharField(max_length=20, blank=True)
    engine_type = models.CharField(max_length=50, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vehicles"
        indexes = [
            models.Index(fields=["vehicle_name"]),
            models.Index(fields=["model_year"]),
        ]

    def __str__(self):
        return self.vehicle_name or f"Vehicle {self.id}"


# ==========================
# 車両登録情報
# ==========================
class VehicleRegistration(models.Model):
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE, related_name="registrations"
    )
    registration_area = models.CharField(max_length=50, blank=True, null=True)
    registration_no = models.CharField(max_length=20, blank=True, null=True)
    certification_no = models.CharField(max_length=50, blank=True, null=True)
    inspection_expiration = models.DateField(null=True, blank=True)
    first_registration_date = models.DateField(null=True, blank=True)
    security_registration = models.CharField(max_length=100, blank=True, null=True)
    effective_from = models.DateField(null=True, blank=True)
    effective_to = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vehicle_registrations"
        ordering = ["-created_at"]


# ==========================
# 保険
# ==========================
class VehicleInsurance(models.Model):
    TYPE_CHOICES = [
        ("mandatory", "Mandatory"),
        ("optional", "Optional"),
    ]

    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE, related_name="insurances"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, blank=True, null=True)
    company = models.CharField(max_length=120, blank=True, null=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    policy_no = models.CharField(max_length=60, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vehicle_insurances"
        ordering = ["-start_date"]


# ==========================
# 保証情報（Warranty）
# ==========================
class VehicleWarranty(models.Model):
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE, related_name="warranties"
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    plan_name = models.CharField(max_length=255, blank=True, null=True)
    note = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vehicle_warranties"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.vehicle} 保証 {self.plan_name or ''}"


# ==========================
# メモ（VehicleMemo）
# ==========================
class VehicleMemo(models.Model):
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.CASCADE,
        related_name="memos",
    )
    body = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="vehicle_memos",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "vehicle_memos"
        indexes = [models.Index(fields=["vehicle"])]
        ordering = ["-created_at"]

    def __str__(self):
        body_preview = (self.body or "")[:20]
        return f"Memo(Vehicle:{self.vehicle_id}) {body_preview}"


# ==========================
# 車両画像（VehicleImage）
# ==========================
class VehicleImage(models.Model):
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(
        upload_to="vehicle_images/",
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "gif"])],
    )
    disk = models.CharField(max_length=30, default="public")
    mime = models.CharField(max_length=100, blank=True, null=True)
    width = models.IntegerField(blank=True, null=True)
    height = models.IntegerField(blank=True, null=True)
    bytes = models.BigIntegerField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vehicle_images"
        indexes = [models.Index(fields=["vehicle"])]

    def save(self, *args, **kwargs):
        if self.image:
            try:
                img = Image.open(self.image)
                self.width, self.height = img.size
                self.bytes = self.image.size
                self.mime = Image.MIME.get(img.format, None)
            except Exception as e:
                print(f"Image metadata extract failed: {e}")
        super().save(*args, **kwargs)


@receiver(post_delete, sender=VehicleImage)
def delete_vehicle_image_file(sender, instance, **kwargs):
    if instance.image and instance.image.path:
        if os.path.isfile(instance.image.path):
            os.remove(instance.image.path)
