# core/management/commands/seed_units.py

from django.core.management.base import BaseCommand
from core.models.unit import Unit


UNITS = [
    "個","台","本","件","箱","組","枚","足","着","式","㍑","CC","冊",
    "販売","調整","締付","清掃","給油","修理","分解","交換","取付",
    "補充","点検","脱着","板金","塗装","配線","溶接","組換","仕上",
    "組立","見積",
]


class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        for name in UNITS:
            Unit.objects.get_or_create(name=name)

        self.stdout.write(self.style.SUCCESS("Units seeded"))