import csv
from django.core.management.base import BaseCommand
from core.models import ManufacturerGroup


class Command(BaseCommand):
    help = "Import manufacturer groups"

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str)

    def handle(self, *args, **options):
        path = options["csv_file"]
        created = 0

        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)

            for row in reader:
                code = row["code"].strip()
                name = row["name"].strip()

                obj, is_created = ManufacturerGroup.objects.update_or_create(
                    code=code,
                    defaults={"name": name},
                )

                if is_created:
                    created += 1

        self.stdout.write(self.style.SUCCESS(f"Groups created: {created}"))
