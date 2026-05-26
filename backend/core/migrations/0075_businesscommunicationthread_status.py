from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0074_order_internal_memo'),
    ]

    operations = [
        migrations.AddField(
            model_name='businesscommunicationthread',
            name='status',
            field=models.CharField(
                choices=[('pending', '未対応'), ('done', '対応済み')],
                default='pending',
                max_length=20,
                verbose_name='ステータス',
            ),
        ),
    ]
