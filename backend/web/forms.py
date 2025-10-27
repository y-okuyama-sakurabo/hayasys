# core/forms.py
from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AuthenticationForm
from core.models import Customer, CustomerClass, Gender, Region, Shop, CustomerImage, CustomerMemo, Vehicle, CustomerVehicle

User = get_user_model()


# ログインフォーム：認証は AuthenticationForm を継承
class LoginForm(AuthenticationForm):
    pass


class CustomerForm(forms.ModelForm):
    # --- 外部キーの選択肢 ---
    customer_class = forms.ModelChoiceField(
        queryset=CustomerClass.objects.none(),  # __init__で設定
        required=True,
        empty_label="選択してください",
        label="顧客分類",
    )
    staff = forms.ModelChoiceField(
        queryset=User.objects.none(),  # __init__で設定
        required=False,
        empty_label="（未設定）",
        label="担当スタッフ",
    )
    region = forms.ModelChoiceField(
        queryset=Region.objects.none(),  # __init__で設定
        required=False,
        empty_label="（未設定）",
        label="地域",
    )
    gender = forms.ModelChoiceField(
        queryset=Gender.objects.none(),  # __init__で設定
        required=False,
        empty_label="（未設定）",
        label="性別",
    )
    first_shop = forms.ModelChoiceField(
        queryset=Shop.objects.none(),  # __init__で設定
        required=False,
        empty_label="（未設定）",
        label="初回対応店舗",
    )
    last_shop = forms.ModelChoiceField(
        queryset=Shop.objects.none(),  # __init__で設定
        required=False,
        empty_label="（未設定）",
        label="最終対応店舗",
    )

    class Meta:
        model = Customer
        fields = [
            "name",
            "kana",
            "email",
            "phone",
            "mobile_phone",
            "postal_code",
            "address",
            "company",
            "company_phone",
            "customer_class",
            "staff",
            "region",
            "gender",
            "birthdate",
            "first_shop",
            "last_shop",
        ]
        labels = {
            "name": "名前",
            "kana": "フリガナ",
            "email": "メールアドレス",
            "phone": "電話番号",
            "mobile_phone": "携帯電話番号",
            "postal_code": "郵便番号",
            "address": "住所",
            "company": "会社",
            "company_phone": "会社電話番号",
            "birthdate": "誕生日",
        }
        widgets = {
            "name": forms.TextInput(attrs={"placeholder": "山田太郎"}),
            "kana": forms.TextInput(attrs={"placeholder": "ヤマダタロウ"}),
            "email": forms.EmailInput(attrs={"placeholder": "taro@example.com"}),
            "phone": forms.TextInput(attrs={"placeholder": "03-1234-5678"}),
            "mobile_phone": forms.TextInput(attrs={"placeholder": "090-1234-5678"}),
            "postal_code": forms.TextInput(attrs={"placeholder": "100-0001"}),
            "address": forms.TextInput(attrs={"placeholder": "東京都千代田区…"}),
            "company": forms.TextInput(attrs={"placeholder": "サンプル株式会社"}),
            "company_phone": forms.TextInput(attrs={"placeholder": "03-1111-2222"}),
            "birthdate": forms.DateInput(attrs={"type": "date"}),
        }

    # --- 軽い整形 ---
    def clean_email(self):
        email = self.cleaned_data.get("email")
        return email.lower() if email else email

    def clean_postal_code(self):
        v = self.cleaned_data.get("postal_code", "")
        return v.replace("-", "").strip() if v else v

    def clean_phone(self):
        v = self.cleaned_data.get("phone", "")
        return v.replace("-", "").strip() if v else v

    def clean_mobile_phone(self):
        v = self.cleaned_data.get("mobile_phone", "")
        return v.replace("-", "").strip() if v else v

    # --- 選択肢の並び順を id 昇順に統一 ---
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["customer_class"].queryset = CustomerClass.objects.order_by("id")
        self.fields["region"].queryset = Region.objects.order_by("id")
        self.fields["gender"].queryset = Gender.objects.order_by("id")
        self.fields["first_shop"].queryset = Shop.objects.order_by("id")
        self.fields["last_shop"].queryset = Shop.objects.order_by("id")
        self.fields["staff"].queryset = User.objects.filter(is_active=True).order_by("id")

class CustomerImageForm(forms.ModelForm):
    class Meta:
        model = CustomerImage
        fields = ["image"]  # 画像だけアップロード

class CustomerMemoForm(forms.ModelForm):
    class Meta:
        model = CustomerMemo
        fields = ["body"]
        labels = {"body": "メモ内容"}
        widgets = {
            "body": forms.Textarea(attrs={
                "rows": 3,
                "placeholder": "メモを入力してください",
            })
        }

# core/forms.py
from django import forms
from core.models import CustomerVehicle

class OwnershipForm(forms.ModelForm):
    class Meta:
        model = CustomerVehicle
        fields = ["vehicle", "owned_from", "owned_to"]
        labels = {
            "vehicle": "所有車両",
            "owned_from": "所有開始日",
            "owned_to": "所有終了日",
        }
        widgets = {
            "owned_from": forms.DateInput(attrs={"type": "date"}),
            "owned_to": forms.DateInput(attrs={"type": "date"}),
        }

class VehicleForm(forms.ModelForm):
    class Meta:
        model = Vehicle
        fields = ["vehicle_name", "model_year", "chassis_no", "color_name", "color_code"]
        labels = {
            "vehicle_name": "車名",
            "model_year": "年式",
            "chassis_no": "車台番号",
            "color_name": "カラー名",
            "color_code": "カラーコード",
        }
        widgets = {
            "vehicle_name": forms.TextInput(attrs={"placeholder": "例: Ninja 400"}),
            "model_year": forms.NumberInput(attrs={"placeholder": "2024"}),
            "chassis_no": forms.TextInput(attrs={"placeholder": "ABC123456"}),
            "color_name": forms.TextInput(attrs={"placeholder": "メタリックグリーン"}),
            "color_code": forms.TextInput(attrs={"placeholder": "GR123"}),
        }