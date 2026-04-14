# core/management/commands/seed_units.py

from django.core.management.base import BaseCommand
from core.models.unit import Unit


UNITS = [
    "個","台","本","件","箱","組","枚","足","着","式","㍑","CC","冊"
]


class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        for name in UNITS:
            Unit.objects.get_or_create(name=name)

        self.stdout.write(self.style.SUCCESS("Units seeded"))