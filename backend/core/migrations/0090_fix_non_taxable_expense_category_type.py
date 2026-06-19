from django.db import migrations


def fix_non_taxable_expense(apps, schema_editor):
    """
    0089 で expense を全て taxable_expense にしたが、
    tax_type=non_taxable だったものは non_taxable_expense に戻す。
    """
    Category = apps.get_model("core", "Category")
    updated = Category.objects.filter(
        category_type="taxable_expense",
        tax_type="non_taxable",
    ).update(category_type="non_taxable_expense")
    print(f"  Fixed {updated} categories: taxable_expense(non_taxable) -> non_taxable_expense")


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0089_category_soft_delete_and_type_update"),
    ]

    operations = [
        migrations.RunPython(fix_non_taxable_expense, migrations.RunPython.noop),
    ]
