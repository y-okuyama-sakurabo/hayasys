# core/models/estimate_vehicle.py
from django.db import models


class EstimateVehicle(models.Model):

    estimate = models.ForeignKey(
        "core.Estimate",
        on_delete=models.CASCADE,
        related_name="estimate_vehicles"
    )

    is_trade_in = models.BooleanField(
        default=False,
        help_text="Trueなら下取り車両、Falseなら商談車両"
    )

    source_customer_vehicle = models.ForeignKey(
        "core.CustomerVehicle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="既存所有車両から生成された場合"
    )

    # 🔥 追加：カテゴリ（超重要）
    category = models.ForeignKey(
        "core.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="estimate_vehicles"
    )

    vehicle_name = models.CharField(max_length=100, blank=True)

    displacement = models.IntegerField(null=True, blank=True)
    model_year = models.CharField(max_length=10, blank=True)

    new_car_type = models.CharField(
        max_length=20,
        blank=True
    )  # "new" / "used"

    manufacturer = models.ForeignKey(
        "core.Manufacturer",
        on_delete=models.PROTECT,
        null=True,
        blank=True
    )

    color_name = models.CharField(max_length=50, blank=True, null=True)
    color_code = models.CharField(max_length=20, blank=True, null=True)
    model_code = models.CharField(max_length=50, blank=True, null=True)
    chassis_no = models.CharField(max_length=50, blank=True, null=True)
    engine_type = models.CharField(max_length=50, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "estimate_vehicles"

    def __str__(self):
        label = "下取り車両" if self.is_trade_in else "商談車両"
        return f"{label}: {self.vehicle_name or '(未設定)'}"
