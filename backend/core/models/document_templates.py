from django.db import models


SOURCE_KEY_CHOICES = [
    # 顧客情報
    ("customer.name",         "顧客氏名"),
    ("customer.kana",         "顧客フリガナ"),
    ("customer.postal_code",  "郵便番号"),
    ("customer.address",      "住所"),
    ("customer.phone",        "電話番号"),
    ("customer.mobile_phone", "携帯電話"),
    # 車両情報
    ("vehicle.vehicle_name",  "車名"),
    ("vehicle.model_code",    "型式"),
    ("vehicle.chassis_no",    "車台番号"),
    ("vehicle.engine_type",   "原動機型式"),
    ("vehicle.displacement",  "排気量"),
    ("vehicle.model_year",    "年式"),
    ("vehicle.color_name",    "車体の色"),
    # 登録情報
    ("registration.registration_no",       "標識番号"),
    ("registration.registration_area",     "登録地域"),
    ("registration.inspection_expiration", "車検満了日"),
    ("registration.first_registration_date", "初年度登録"),
    # 会社情報
    ("company.name",    "会社名"),
    ("company.address", "会社住所"),
    ("company.phone",   "会社電話"),
    # 日付
    ("date_today",      "今日の日付 (YYYY/MM/DD)"),
    ("date_wareki",     "今日の日付（和暦）"),
    # その他
    ("static",  "固定テキスト"),
    ("input",   "手入力"),
]


class DocumentTemplate(models.Model):
    name = models.CharField("書類名", max_length=100)
    description = models.TextField("備考", blank=True)
    paper_width = models.FloatField("用紙幅 (mm)", default=210)
    paper_height = models.FloatField("用紙高さ (mm)", default=297)
    is_active = models.BooleanField("有効", default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "document_templates"
        ordering = ["name"]

    def __str__(self):
        return self.name


class DocumentField(models.Model):
    template = models.ForeignKey(
        DocumentTemplate,
        on_delete=models.CASCADE,
        related_name="fields",
    )
    label = models.CharField("項目名（管理用）", max_length=100)
    source_key = models.CharField(
        "値の取得元",
        max_length=60,
        choices=SOURCE_KEY_CHOICES,
    )
    static_value = models.CharField(
        "固定テキスト",
        max_length=200,
        blank=True,
        help_text="source_key='static' のときに使用",
    )
    input_label = models.CharField(
        "手入力ラベル",
        max_length=100,
        blank=True,
        help_text="source_key='input' のときに印刷画面で表示するラベル",
    )
    x = models.FloatField("X座標 (mm)", default=0)
    y = models.FloatField("Y座標 (mm)", default=0)
    font_size = models.FloatField("フォントサイズ (pt)", default=10)
    letter_spacing = models.FloatField(
        "文字間隔 (mm)",
        default=0,
        help_text="1文字1マスの欄に入力するときに使用",
    )
    order = models.IntegerField("表示順", default=0)

    class Meta:
        db_table = "document_fields"
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.template.name} / {self.label}"
