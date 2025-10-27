from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.conf import settings
# from django.contrib.postgres.fields import CICharField, CIEmailField  # ← 不要になったので削除
from django.db.models import Q, F
from django.core.validators import FileExtensionValidator
from PIL import Image
from django.core.files.base import ContentFile
from django.db.models.signals import post_delete
from django.dispatch import receiver
import os

class Shop(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=120)
    location = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    fax = models.CharField(max_length=20, blank=True)
    email = models.EmailField(max_length=255, blank=True)
    opening_hours = models.CharField(max_length=100, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        indexes = [models.Index(fields=["code"]), models.Index(fields=["name"])]
    def __str__(self): return f"{self.code} {self.name}"

class UserManager(BaseUserManager):
    use_in_migrations = True
    def create_user(self, login_id, password=None, **extra_fields):
        if not login_id:
            raise ValueError("The login_id must be set")
        user = self.model(login_id=login_id, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    def create_superuser(self, login_id, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self.create_user(login_id, password, **extra_fields)

class User(AbstractUser):
    username = None
    login_id = models.CharField(max_length=50, unique=True)
    shop = models.ForeignKey(Shop, on_delete=models.PROTECT, null=True, blank=True)
    role = models.CharField(max_length=20, default="staff")
    USERNAME_FIELD = "login_id"
    REQUIRED_FIELDS: list[str] = []
    objects = UserManager()
    def __str__(self): return self.login_id

class CustomerClass(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=50)
    is_wholesale = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return self.name

class Gender(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self): return self.name

class Region(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # ← 修正：auto_now
    def __str__(self): return self.name


class Customer(models.Model):
    name = models.CharField(max_length=100)
    kana = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(max_length=255, blank=True, null=True)
    postal_code = models.CharField(max_length=10, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    mobile_phone = models.CharField(max_length=20, blank=True, null=True)
    company = models.CharField(max_length=100, blank=True, null=True)          # ← null=True 追加
    company_phone = models.CharField(max_length=20, blank=True, null=True)

    customer_class = models.ForeignKey('CustomerClass', on_delete=models.PROTECT, related_name='customers')
    staff = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='customers')
    region = models.ForeignKey('Region', on_delete=models.SET_NULL, null=True, blank=True, related_name='customers')
    gender = models.ForeignKey('Gender', on_delete=models.SET_NULL, null=True, blank=True, related_name='customers')

    birthdate = models.DateField(null=True, blank=True)
    first_shop = models.ForeignKey('Shop', on_delete=models.SET_NULL, null=True, blank=True, related_name='first_customers')
    last_shop  = models.ForeignKey('Shop', on_delete=models.SET_NULL, null=True, blank=True, related_name='last_customers')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['kana']),
            models.Index(fields=['phone']),
            models.Index(fields=['mobile_phone']),
            models.Index(fields=['customer_class']),
            models.Index(fields=['last_shop']),
        ]

    def __str__(self): return self.name

class Vehicle(models.Model):
    vehicle_name   = models.CharField(max_length=100, blank=True)
    displacement   = models.IntegerField(null=True, blank=True)
    model_year     = models.CharField(max_length=10, blank=True)
    new_car_type   = models.CharField(max_length=20, blank=True)  # new/used
    manufacturer = models.ForeignKey("core.Manufacturer", on_delete=models.PROTECT, null=True, blank=True)
    category     = models.ForeignKey("core.VehicleCategory", on_delete=models.PROTECT, null=True, blank=True)
    color        = models.ForeignKey("core.Color", on_delete=models.SET_NULL, null=True, blank=True)
    model_code     = models.CharField(max_length=50, blank=True)
    chassis_no     = models.CharField(max_length=50, blank=True, null=True, unique=True)
    color_name     = models.CharField(max_length=50, blank=True)
    color_code     = models.CharField(max_length=20, blank=True)
    engine_type    = models.CharField(max_length=50, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["vehicle_name"]),
            models.Index(fields=["model_year"]),
        ]

    def __str__(self):
        return self.vehicle_name or f"Vehicle {self.id}"


class VehicleRegistration(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="registrations")
    registration_area = models.CharField(max_length=50, blank=True, null=True)
    registration_no = models.CharField(max_length=20, blank=True, null=True)
    certification_no = models.CharField(max_length=50, blank=True, null=True)
    inspection_expiration = models.DateField(null=True, blank=True)
    first_registration_date = models.DateField(null=True, blank=True)
    security_registration = models.CharField(max_length=100, blank=True, null=True)
    effective_from = models.DateField(null=True, blank=True)
    effective_to = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class VehicleInsurance(models.Model):
    TYPE_CHOICES = [
        ("mandatory", "Mandatory"),
        ("optional", "Optional"),
    ]

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="insurances")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, blank=True, null=True)
    company = models.CharField(max_length=120, blank=True, null=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    policy_no = models.CharField(max_length=60, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class VehicleWarranty(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="warranties")
    start_date = models.DateField(null=True, blank=True)
    end_date   = models.DateField(null=True, blank=True)
    plan_name = models.CharField(max_length=255, blank=True, null=True)
    note = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class VehicleMemo(models.Model):
    vehicle = models.ForeignKey(
        "core.Vehicle",               # モデル名を文字列で指定（循環import防止）
        on_delete=models.CASCADE,
        related_name="memos",
    )
    body = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="vehicle_memos",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "vehicle_memos"
        indexes = [
            models.Index(fields=["vehicle"]),
        ]
        ordering = ["-created_at"]  # 新しいメモを上に表示する場合おすすめ

    def __str__(self):
        body_preview = (self.body or "")[:20]
        return f"Memo(Vehicle:{self.vehicle_id}) {body_preview}"



class CustomerVehicle(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="customer_vehicles")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name="customer_vehicles")
    owned_from = models.DateField(null=True, blank=True)
    owned_to = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["customer", "vehicle", "owned_from"], name="uq_customer_vehicle_from")]
        indexes = [models.Index(fields=["customer", "owned_to"]), models.Index(fields=["vehicle", "owned_to"])]
    def __str__(self): return f"{self.customer_id}-{self.vehicle_id}"

class CustomerImage(models.Model):
    customer = models.ForeignKey("core.Customer", on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(
        upload_to="customer_images/",
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "gif"])],
    )
    disk = models.CharField(max_length=30, default="public")
    mime = models.CharField(max_length=100, blank=True, null=True)
    width = models.IntegerField(blank=True, null=True)
    height = models.IntegerField(blank=True, null=True)
    bytes = models.BigIntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "customer_images"
        indexes = [models.Index(fields=["customer"])]

    def save(self, *args, **kwargs):
        # image がある場合のみ処理
        if self.image:
            try:
                # Pillow で画像を開く
                img = Image.open(self.image)
                self.width, self.height = img.size
                self.bytes = self.image.size   # ← Django の InMemoryUploadedFile の size
                self.mime = Image.MIME.get(img.format, None)
            except Exception as e:
                # 画像が壊れている場合などはスキップ
                print(f"Image metadata extract failed: {e}")

        super().save(*args, **kwargs)

class CustomerMemo(models.Model):
    customer = models.ForeignKey(
        "core.Customer",
        related_name="memos",
        on_delete=models.CASCADE,
    )
    body = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)  # 論理削除用

    class Meta:
        db_table = "customer_memos"

    def __str__(self):
        return f"Memo({self.customer_id}): {self.body[:20]}"

@receiver(post_delete, sender=CustomerImage)
def delete_image_file(sender, instance, **kwargs):
    if instance.image and instance.image.path:
        if os.path.isfile(instance.image.path):
            os.remove(instance.image.path)

class Manufacturer(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "manufacturers"
        indexes = [models.Index(fields=["code"]), models.Index(fields=["name"])]

    def __str__(self):
        return self.name

class VehicleCategory(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vehicle_categories"
        indexes = [models.Index(fields=["code"]), models.Index(fields=["name"])]

    def __str__(self):
        return self.name


class Color(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "colors"
        indexes = [models.Index(fields=["code"]), models.Index(fields=["name"])]

    def __str__(self):
        return self.name

class RegistrationLocation(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "registration_locations"
        ordering = ["id"]

    def __str__(self):
        return self.name
    
class VehicleImage(models.Model):
    vehicle = models.ForeignKey("core.Vehicle", on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(
        upload_to="vehicle_images/",
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "gif"])],
    )
    disk = models.CharField(max_length=30, default="public")
    mime = models.CharField(max_length=100, blank=True, null=True)
    width = models.IntegerField(blank=True, null=True)
    height = models.IntegerField(blank=True, null=True)
    bytes = models.BigIntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vehicle_images"
        indexes = [models.Index(fields=["vehicle"])]

    def save(self, *args, **kwargs):
        # image がある場合のみ処理
        if self.image:
            try:
                # Pillow で画像を開く
                img = Image.open(self.image)
                self.width, self.height = img.size
                self.bytes = self.image.size   # ← Django の InMemoryUploadedFile の size
                self.mime = Image.MIME.get(img.format, None)
            except Exception as e:
                # 画像が壊れている場合などはスキップ
                print(f"Image metadata extract failed: {e}")

        super().save(*args, **kwargs)

class Schedule(models.Model):
    customer = models.ForeignKey(
        "core.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="schedules"
    )

    shop = models.ForeignKey(
        "core.Shop",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="schedules"
    )

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="schedules"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_at"]

    def __str__(self):
        return f"{self.title} ({self.start_at:%Y-%m-%d})"
    
class BusinessCommunication(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    sender_shop = models.ForeignKey(
        Shop, on_delete=models.PROTECT, related_name="sent_business_communications"
    )
    receiver_shop = models.ForeignKey(
        Shop, on_delete=models.PROTECT, related_name="received_business_communications"
    )
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="business_communications"
    )
    title = models.CharField(max_length=100)
    content = models.TextField()
    status = models.CharField(max_length=20, choices=[("pending", "未対応"), ("done", "対応済み")], default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.sender_shop} → {self.receiver_shop})"
    
class EstimateParty(models.Model):
    """
    見積用 顧客スナップショット
    """
    source_customer = models.ForeignKey(
        "core.Customer",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="estimate_parties",
        help_text="元となった顧客（任意）"
    )
    name = models.CharField("顧客名", max_length=100)
    kana = models.CharField("フリガナ", max_length=100, blank=True)
    customer_class = models.ForeignKey(
        CustomerClass,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    postal_code = models.CharField("郵便番号", max_length=10, blank=True)
    address = models.CharField("住所", max_length=255, blank=True)
    phone = models.CharField("電話番号", max_length=20, blank=True)
    mobile_phone = models.CharField("携帯電話番号", max_length=20, blank=True)
    company = models.CharField("会社名", max_length=100, blank=True)
    company_phone = models.CharField("会社電話番号", max_length=20, blank=True)
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="estimate_parties"
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    gender = models.ForeignKey(
        Gender,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    birthdate = models.DateField("生年月日", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "estimate_parties"
        verbose_name = "見積用顧客スナップショット"
        verbose_name_plural = "見積用顧客スナップショット"

    def __str__(self):
        return self.name


class Estimate(models.Model):
    """
    見積ヘッダ
    """
    STATUS_CHOICES = [
        ("draft", "下書き"),
        ("issued", "提出済み"),
        ("expired", "期限切れ"),
        ("ordered", "受注済み"),
    ]

    estimate_no = models.BigIntegerField("見積番号", unique=True)
    shop = models.ForeignKey(
        Shop,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="estimates"
    )
    status = models.CharField(
        "ステータス",
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft"
    )
    estimate_date = models.DateField("見積日", null=True, blank=True)

    # 顧客スナップショットとの紐づけ
    party = models.ForeignKey(
        EstimateParty,
        on_delete=models.PROTECT,
        related_name="estimates"
    )

    # 金額系
    subtotal = models.DecimalField("小計", max_digits=12, decimal_places=2, default=0)
    discount_total = models.DecimalField("値引額", max_digits=12, decimal_places=2, default=0)
    tax_total = models.DecimalField("税額", max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField("合計金額", max_digits=12, decimal_places=2, default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="created_estimates"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "estimates"
        verbose_name = "見積"
        verbose_name_plural = "見積"
        ordering = ["-created_at"]

    def __str__(self):
        return f"見積 {self.estimate_no}（{self.party.name}）"
    