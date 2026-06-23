from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0090_fix_non_taxable_expense_category_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="app_no",
            field=models.CharField("アプリNo", max_length=50, blank=True, null=True),
        ),
    ]
