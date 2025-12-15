from django.db import models

class OrderVehicle(models.Model):
    order = models.ForeignKey(
        "core.Order",
        on_delete=models.CASCADE,
        related_name="order_vehicles",
    )
    is_trade_in = models.BooleanField(
        default=False,
        help_text="Trueなら下取り車両、Falseなら商談車両"
    )

    vehicle_name = models.CharField(max_length=100, blank=True)
    displacement = models.IntegerField(null=True, blank=True)
    model_year = models.CharField(max_length=10, blank=True)
    new_car_type = models.CharField(max_length=20, blank=True)
    manufacturer = models.ForeignKey(
        "core.Manufacturer",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    color_name = models.CharField(max_length=50, blank=True)
    color_code = models.CharField(max_length=20, blank=True)
    model_code = models.CharField(max_length=50, blank=True)
    chassis_no = models.CharField(max_length=50, blank=True, null=True)
    engine_type = models.CharField(max_length=50, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "order_vehicles"

    def __str__(self):
      label = "下取り" if self.is_trade_in else "商談"
      return f"{label}: {self.vehicle_name or '(未設定)'}"
