from django.db import models


# ==========================
# 商品カテゴリ（大・中・小）
# ==========================
class ProductCategoryLarge(models.Model):
    name = models.CharField("大カテゴリ名", max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "product_category_large"
        ordering = ["id"]

    def __str__(self):
        return self.name


class ProductCategoryMiddle(models.Model):
    large = models.ForeignKey(
        ProductCategoryLarge, on_delete=models.CASCADE, related_name="middles"
    )
    name = models.CharField("中カテゴリ名", max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "product_category_middle"
        ordering = ["id"]

    def __str__(self):
        return f"{self.large.name} > {self.name}"


class ProductCategorySmall(models.Model):
    middle = models.ForeignKey(
        ProductCategoryMiddle, on_delete=models.CASCADE, related_name="smalls"
    )
    name = models.CharField("小カテゴリ名", max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "product_category_small"
        ordering = ["id"]

    def __str__(self):
        return f"{self.middle.large.name} > {self.middle.name} > {self.name}"


# ==========================
# 商品
# ==========================
# class Product(models.Model):
#     small = models.ForeignKey(
#         ProductCategorySmall, on_delete=models.PROTECT, related_name="products"
#     )
#     name = models.CharField("商品名", max_length=200)
#     unit_price = models.DecimalField("単価", max_digits=10, decimal_places=2, default=0)
#     tax_type = models.CharField(
#         "課税区分",
#         max_length=20,
#         choices=[("taxable", "課税"), ("non_taxable", "非課税")],
#         default="taxable",
#     )
#     is_active = models.BooleanField(default=True)

#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     class Meta:
#         db_table = "products"
#         ordering = ["name"]

#     def __str__(self):
#         return f"{self.name} ({self.small.name})"
    