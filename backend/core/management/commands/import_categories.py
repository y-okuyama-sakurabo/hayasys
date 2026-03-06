import csv
from django.core.management.base import BaseCommand
from core.models import Category, ManufacturerGroup


TYPE_MAP = {
    "車両": "vehicle",
    "商品": "item",
    "その他": "other",
    "保険": "insurance",
    "諸費用": "expense",
}


class Command(BaseCommand):
    help = "Import Categories from CSV (with category_type support)"

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str)

    def handle(self, *args, **options):
        file_path = options["csv_file"]

        created = 0

        with open(file_path, newline="", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)

            for row in reader:
                parent = None

                category_type = TYPE_MAP.get(row.get("type"))

                levels = [
                    row.get("L1"),
                    row.get("L2"),
                    row.get("L3"),
                    row.get("L4"),
                ]

                for index, level in enumerate(levels):
                    if not level:
                        continue

                    # L1のみ category_type をセット
                    if index == 0:
                        obj, _ = Category.objects.get_or_create(
                            name=level,
                            parent=None,
                            defaults={"category_type": category_type},
                        )

                        # 既存L1でtype未設定なら更新
                        if obj.category_type != category_type:
                            obj.category_type = category_type
                            obj.save()
                    else:
                        obj, _ = Category.objects.get_or_create(
                            name=level,
                            parent=parent,
                        )

                    parent = obj

                # 最下層に manufacturer_group を紐付け
                if parent and row.get("manufacturer_group"):
                    group = ManufacturerGroup.objects.filter(
                        code=row["manufacturer_group"]
                    ).first()

                    if group:
                        parent.manufacturer_group = group
                        parent.save()

                created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Category Import Complete. Processed: {created}")
        )
