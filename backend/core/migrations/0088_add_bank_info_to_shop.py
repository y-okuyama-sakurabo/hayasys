from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0087_document_templates"),
    ]

    operations = [
        migrations.AddField(
            model_name="shop",
            name="bank_name",
            field=models.CharField("銀行名", max_length=100, blank=True),
        ),
        migrations.AddField(
            model_name="shop",
            name="bank_branch_name",
            field=models.CharField("支店名", max_length=100, blank=True),
        ),
        migrations.AddField(
            model_name="shop",
            name="bank_account_type",
            field=models.CharField("口座種別", max_length=10, blank=True),
        ),
        migrations.AddField(
            model_name="shop",
            name="bank_account_no",
            field=models.CharField("口座番号", max_length=20, blank=True),
        ),
        migrations.AddField(
            model_name="shop",
            name="bank_account_holder",
            field=models.CharField("口座名義", max_length=100, blank=True),
        ),
    ]
