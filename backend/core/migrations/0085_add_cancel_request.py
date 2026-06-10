from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0084_add_company_to_payment_record"),
    ]

    operations = [
        migrations.CreateModel(
            name="CancelRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reason", models.TextField(verbose_name="キャンセル理由")),
                ("status", models.CharField(
                    choices=[("pending", "申請中"), ("approved", "承認済"), ("rejected", "却下")],
                    default="pending",
                    max_length=20,
                    verbose_name="ステータス",
                )),
                ("reviewed_at", models.DateTimeField(null=True, blank=True, verbose_name="処理日時")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("order", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="cancel_requests",
                    to="core.order",
                    verbose_name="受注",
                )),
                ("requested_by", models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="submitted_cancel_requests",
                    to="core.user",
                    verbose_name="申請者",
                )),
                ("reviewed_by", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="reviewed_cancel_requests",
                    to="core.user",
                    verbose_name="承認者",
                )),
            ],
            options={"db_table": "cancel_requests", "ordering": ["-created_at"]},
        ),
    ]
