from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericRelation
from core.models.payments import Payment

from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator

class EstimateParty(models.Model):
    """
    見積時点の顧客情報（Customer候補）
    Customerと同等のフィールドを保持して、受注確定時にCustomerへ昇格させる。
    """
    source_customer = models.ForeignKey(
        "core.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="元となった顧客がある場合のみ参照"
    )

    # 基本情報
    name = models.CharField("氏名", max_length=100)
    kana = models.CharField("カナ", max_length=100, blank=True, null=True)
    email = models.EmailField("メールアドレス", max_length=255, blank=True, null=True)
    postal_code = models.CharField("郵便番号", max_length=10, blank=True, null=True)
    address = models.CharField("住所", max_length=255, blank=True, null=True)
    phone = models.CharField("電話番号", max_length=20, blank=True, null=True)
    mobile_phone = models.CharField("携帯電話", max_length=20, blank=True, null=True)
    company = models.CharField("会社名", max_length=100, blank=True, null=True)
    company_phone = models.CharField("会社電話番号", max_length=20, blank=True, null=True)

    # 外部マスタ類（後からCustomer化するときに反映できるように確保）
    customer_class = models.ForeignKey(
        "core.CustomerClass",
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    region = models.ForeignKey(
        "core.Region",
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    gender = models.ForeignKey(
        "core.Gender",
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    first_shop = models.ForeignKey(
        "core.Shop",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="first_estimate_parties"
    )
    last_shop = models.ForeignKey(
        "core.Shop",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="last_estimate_parties"
    )

    birthdate = models.DateField("生年月日", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "estimate_parties"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Estimate(models.Model):
    STATUS_CHOICES = [("draft","下書き"),("issued","提出済み"),("ordered","受注済み")]
    estimate_no = models.CharField(max_length=20, unique=True)
    shop = models.ForeignKey("core.Shop", on_delete=models.SET_NULL, null=True, blank=True)
    party = models.ForeignKey(EstimateParty, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    estimate_date = models.DateField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payments = GenericRelation(Payment, related_query_name="estimate")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

# core/models/estimates.py

class EstimateItem(models.Model):
    """
    見積明細
    """
    estimate = models.ForeignKey(
        "core.Estimate",
        on_delete=models.CASCADE,
        related_name="items"
    )
    product = models.ForeignKey(
        "core.Product",
        on_delete=models.PROTECT,
        related_name="estimate_items",
        null=True, blank=True,
        help_text="商品マスタに存在しない場合は手入力可"
    )
    name = models.CharField("項目名", max_length=200)
    quantity = models.DecimalField("数量", max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField("単価", max_digits=10, decimal_places=2, default=0)
    tax_type = models.CharField(
        "課税区分",
        max_length=20,
        choices=[("taxable", "課税"), ("non_taxable", "非課税")],
        default="taxable"
    )
    discount = models.DecimalField("値引額", max_digits=10, decimal_places=2, default=0)
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="estimate_items",
        help_text="作業担当スタッフ"
    )

    # 計算結果
    subtotal = models.DecimalField("小計", max_digits=12, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "estimate_items"
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} × {self.quantity}"

    def calculate_subtotal(self):
        """単価×数量−値引"""
        return (self.unit_price * self.quantity) - self.discount

