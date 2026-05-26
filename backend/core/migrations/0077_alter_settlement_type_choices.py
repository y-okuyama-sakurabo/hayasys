from django.db import migrations, models


def convert_settlement_types(apps, schema_editor):
    """既存の settlement_type を新しい種別に変換する"""
    Settlement = apps.get_model("core", "Settlement")
    # credit → loan
    Settlement.objects.filter(settlement_type="credit").update(settlement_type="loan")
    # advance → transfer
    Settlement.objects.filter(settlement_type="advance").update(settlement_type="transfer")
    # card (カード・クーポン → カード): key は同じなので変換不要
    # coupon は新規追加のみ（既存データなし）
    # qr は新規追加のみ（既存データなし）


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0076_alter_order_status_default_draft"),
    ]

    operations = [
        # まず既存データを新しい種別に変換
        migrations.RunPython(
            convert_settlement_types,
            reverse_code=migrations.RunPython.noop,
        ),
        # 次に choices を更新
        migrations.AlterField(
            model_name="settlement",
            name="settlement_type",
            field=models.CharField(
                max_length=30,
                choices=[
                    ("trade_in", "下取車"),
                    ("cash",     "現金"),
                    ("card",     "カード"),
                    ("loan",     "ローン"),
                    ("qr",       "QR決済"),
                    ("coupon",   "商品券・クーポン"),
                    ("transfer", "振込"),
                ],
            ),
        ),
    ]
