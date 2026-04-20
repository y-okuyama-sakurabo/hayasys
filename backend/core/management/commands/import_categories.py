import csv
from django.core.management.base import BaseCommand
from core.models import Category, ManufacturerGroup


TYPE_MAP = {
    "車両": "vehicle",
    "商品": "item",
    "その他": "other",
    "費用": "expense",  # ← CSVに合わせる
}


class Command(BaseCommand):
    help = "Import Categories (allow same name multiple by type)"

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str)
        parser.add_argument("--reset", action="store_true")

    def handle(self, *args, **options):
        file_path = options["csv_file"]
        reset = options["reset"]

        created = 0

        if reset:
            Category.objects.all().delete()

        with open(file_path, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)

            for row in reader:
                parent = None

                # =========================
                # type / tax_type
                # =========================
                raw_type = (row.get("type") or "").strip()
                category_type = TYPE_MAP.get(raw_type)

                raw_tax_type = (row.get("tax_type") or "").strip()

                if category_type == "expense":
                    tax_type = raw_tax_type or "taxable"
                else:
                    tax_type = None

                # =========================
                # 階層
                # =========================
                levels = [
                    row.get("L1"),
                    row.get("L2"),
                    row.get("L3"),
                    row.get("L4"),
                ]

                for index, level in enumerate(levels):
                    level = (level or "").strip()
                    if not level:
                        continue

                    query = {
                        "name": level,
                        "parent": parent,
                    }

                    # L1のみ type / tax_type を持たせる
                    if index == 0:
                        query["category_type"] = category_type
                        query["tax_type"] = tax_type

                    obj = Category.objects.filter(**query).first()

                    if not obj:
                        obj = Category.objects.create(
                            name=level,
                            parent=parent,
                            category_type=category_type if index == 0 else None,
                            tax_type=tax_type if index == 0 else None,
                        )
                        created += 1

                    parent = obj

                # =========================
                # manufacturer_group
                # =========================
                mg_code = (row.get("manufacturer_group") or "").strip()
                if parent and mg_code:
                    group = ManufacturerGroup.objects.filter(code=mg_code).first()
                    if group:
                        parent.manufacturer_group = group
                        parent.save()

        self.stdout.write(
            self.style.SUCCESS(f"Category Import Complete. Created: {created}")
        )