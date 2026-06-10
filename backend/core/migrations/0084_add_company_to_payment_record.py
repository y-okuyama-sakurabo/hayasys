from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0083_add_payment_company"),
    ]

    operations = [
        migrations.AddField(
            model_name="paymentrecord",
            name="company",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="payment_records",
                to="core.paymentcompany",
                verbose_name="支払会社",
            ),
        ),
    ]
