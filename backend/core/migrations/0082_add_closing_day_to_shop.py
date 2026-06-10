# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0081_add_company_settings_remove_registration_number_from_shop'),
    ]

    operations = [
        migrations.AddField(
            model_name='shop',
            name='closing_day',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
