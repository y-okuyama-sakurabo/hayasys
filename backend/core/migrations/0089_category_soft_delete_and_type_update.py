from django.db import migrations, models
from django.utils import timezone


def convert_category_types(apps, schema_editor):
    """旧 category_type 値を新しい値にデータ移行"""
    Category = apps.get_model("core", "Category")
    mapping = {
        "item":      "other",
        "expense":   "taxable_expense",
        "insurance": "other",
    }
    for old, new in mapping.items():
        Category.objects.filter(category_type=old).update(category_type=new)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0088_add_bank_info_to_shop"),
    ]

    operations = [
        migrations.AddField(
            model_name="category",
            name="is_deleted",
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddField(
            model_name="category",
            name="deleted_at",
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.RunPython(convert_category_types, migrations.RunPython.noop),
    ]
