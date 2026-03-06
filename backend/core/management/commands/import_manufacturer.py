import csv
from django.core.management.base import BaseCommand
from core.models import Manufacturer, ManufacturerGroup


class Command(BaseCommand):
    help = "Import manufacturers"

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str)

    def handle(self, *args, **options):
        path = options["csv_file"]

        created = 0

        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)

            for row in reader:
                name = row["manufacturer_name"].strip()
                group_code = row["group_code"].strip()

                manufacturer, is_created = Manufacturer.objects.get_or_create(
                    name=name
                )

                group = ManufacturerGroup.objects.get(code=group_code)
                manufacturer.groups.add(group)

                if is_created:
                    created += 1

        self.stdout.write(self.style.SUCCESS(f"Manufacturers created: {created}"))
