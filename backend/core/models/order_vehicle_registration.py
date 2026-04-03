from django.db import models


class OrderVehicleRegistration(models.Model):
    vehicle = models.ForeignKey(
        "core.OrderVehicle",
        on_delete=models.CASCADE,
        related_name="registrations"
    )

    registration_area = models.CharField(max_length=50, blank=True, null=True)
    registration_no = models.CharField(max_length=20, blank=True, null=True)
    certification_no = models.CharField(max_length=50, blank=True, null=True)
    inspection_expiration = models.DateField(null=True, blank=True)
    first_registration_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "order_vehicle_registrations"