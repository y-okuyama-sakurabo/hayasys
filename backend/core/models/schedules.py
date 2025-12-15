from django.db import models
from django.conf import settings


class Schedule(models.Model):
    customer = models.ForeignKey("core.Customer", on_delete=models.SET_NULL, null=True, blank=True)
    shop = models.ForeignKey("core.Shop", on_delete=models.SET_NULL, null=True, blank=True)
    staff = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
