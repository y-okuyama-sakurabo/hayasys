"""
旧システムからエクスポートしたExcel/CSVを顧客・所有車両としてインポートする。

使い方:
  python manage.py import_customers_from_excel /path/to/data.xlsx
  python manage.py import_customers_from_excel /path/to/data.csv
  python manage.py import_customers_from_excel /path/to/data.xlsx --dry-run
"""
import sys
from datetime import date

import jaconv
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction

from django.contrib.auth import get_user_model

from core.models.categories import Category, Manufacturer
from core.models.customers import Customer, CustomerMemo, CustomerVehicle
from core.models.masters import Color, CustomerClass, Gender
from core.models.vehicles import Vehicle, VehicleInsurance, VehicleMemo, VehicleRegistration

User = get_user_model()


def _str(val):
    if pd.isna(val):
        return ""
    return str(val).strip()


def _remove_spaces(val: str) -> str:
    return val.replace(" ", "").replace("　", "")


def _int_or_none(val):
    if pd.isna(val):
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def _date_or_none(val):
    if pd.isna(val):
        return None
    if isinstance(val, date):
        return val
    try:
        return pd.to_datetime(val).date()
    except Exception:
        return None


def _first_registration_date(year_str, month_str):
    """初登年＋初登月 → date(year, month, 1)。数値以外は None。"""
    try:
        year = int(float(year_str)) if year_str else None
        month = int(float(month_str)) if month_str else None
        if year and 1900 <= year <= 2100:
            return date(year, month if month and 1 <= month <= 12 else 1, 1)
    except (ValueError, TypeError):
        pass
    return None


class Command(BaseCommand):
    help = "旧システムのExcel/CSVから顧客と所有車両をインポートする"

    def add_arguments(self, parser):
        parser.add_argument("file", help="インポートするExcelまたはCSVファイルのパス")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="DBに保存せず内容を確認するだけ",
        )
        parser.add_argument(
            "--user",
            default=None,
            help="車両メモのcreated_byに使うユーザー名（省略時はスーパーユーザーを自動選択）",
        )

    def handle(self, *args, **options):
        filepath = options["file"]
        dry_run = options["dry_run"]

        # 車両メモのcreated_by用ユーザーを取得
        username = options.get("user")
        if username:
            memo_user = User.objects.get(login_id=username)
        else:
            memo_user = User.objects.filter(is_superuser=True).first()
            if not memo_user:
                memo_user = User.objects.first()
        if not memo_user:
            self.stderr.write("ユーザーが1件もありません。--user オプションでユーザー名を指定してください。")
            sys.exit(1)
        self.stdout.write(f"車両メモ作成者: {memo_user.username}")

        self.stdout.write(f"読み込み中: {filepath}")
        try:
            if filepath.lower().endswith(".csv"):
                df = pd.read_csv(filepath, encoding="shift_jis", dtype=str)
            else:
                df = pd.read_excel(filepath, engine="openpyxl", dtype=str)
        except Exception as e:
            self.stderr.write(f"ファイル読み込みエラー: {e}")
            sys.exit(1)

        self.stdout.write(f"行数: {len(df)}  列数: {len(df.columns)}")

        # --- マスタをキャッシュ ---
        # 性別: "男"/"女" の部分一致でも拾えるようにリストで保持
        all_genders = list(Gender.objects.all())
        manufacturer_map = {m.name: m for m in Manufacturer.objects.all()}
        color_map = {c.name: c for c in Color.objects.all()}
        category_map = {c.name: c for c in Category.objects.filter(category_type="vehicle")}

        # 顧客区分「個人」を取得（敬称が「様」の場合に使用）
        kojin_class = CustomerClass.objects.filter(name__icontains="個人").first()

        def _match_gender(val):
            if not val:
                return None
            for g in all_genders:
                if g.name == val:
                    return g
            # 部分一致フォールバック（"男" → "男性" など）
            for g in all_genders:
                if val in g.name or g.name in val:
                    return g
            return None

        def get(row, idx):
            try:
                return _str(row.iloc[idx - 1])
            except IndexError:
                return ""

        def get_date(row, idx):
            try:
                return _date_or_none(row.iloc[idx - 1])
            except IndexError:
                return None

        def get_int(row, idx):
            try:
                return _int_or_none(row.iloc[idx - 1])
            except IndexError:
                return None

        stats = {
            "customers_created": 0,
            "customers_updated": 0,
            "vehicles_created": 0,
            "cv_created": 0,
            "cv_skipped": 0,
            "skipped": 0,
        }

        seen_customer_no = {}

        for i, row in df.iterrows():
            try:
                with transaction.atomic():
                    customer_no = get(row, 1)
                    customer_name = _remove_spaces(get(row, 4))

                    if not customer_name:
                        stats["skipped"] += 1
                        continue

                    # --- 顧客の作成/更新 ---
                    if customer_no not in seen_customer_no:
                        addr1 = get(row, 5)
                        addr2 = get(row, 6)
                        address = (addr1 + addr2).strip() or None

                        gender = _match_gender(get(row, 35))

                        # 敬称が「様」なら顧客区分を個人に
                        keisho = get(row, 24)
                        customer_class = kojin_class if keisho == "様" else None

                        raw_kana = _remove_spaces(get(row, 3))
                        kana = jaconv.h2z(raw_kana, kana=True, ascii=False, digit=False) if raw_kana else None

                        customer_data = {
                            "kana": kana,
                            "postal_code": get(row, 22) or None,
                            "address": address,
                            "phone": get(row, 102) or None,
                            "mobile_phone": get(row, 103) or None,
                            "company": get(row, 12) or None,
                            "company_phone": get(row, 104) or None,
                            "email": get(row, 47) or None,
                            "birthdate": get_date(row, 36),
                            "gender": gender,
                            "customer_class": customer_class,
                            "app_no": get(row, 32) or None,
                        }

                        if not dry_run:
                            customer, created = Customer.objects.get_or_create(
                                name=customer_name,
                                defaults=customer_data,
                            )
                            if created:
                                stats["customers_created"] += 1
                                # 客ﾒﾓ1-6 (col 88-93) を顧客メモに追加
                                for memo_col in range(88, 94):
                                    body = get(row, memo_col)
                                    if body:
                                        CustomerMemo.objects.create(customer=customer, body=body)
                            else:
                                stats["customers_updated"] += 1

                            # 顧担当 (col 21) — 新規・既存ともに、まだなければ追加
                            legacy_staff = get(row, 21)
                            if legacy_staff and not customer.memos.filter(body__startswith="顧担当:").exists():
                                CustomerMemo.objects.create(customer=customer, body=f"顧担当: {legacy_staff}")
                        else:
                            exists = Customer.objects.filter(name=customer_name).exists()
                            self.stdout.write(
                                f"  [顧客] {'更新' if exists else '新規'}: {customer_name}"
                                f" 性別={get(row, 35)}→{'一致' if gender else '不一致'}"
                                f" 敬称={keisho}"
                            )
                            customer = None
                            stats["customers_created"] += 1

                        seen_customer_no[customer_no] = customer
                    else:
                        customer = seen_customer_no[customer_no]

                    # --- 車両の作成/取得 ---
                    vehicle_name = get(row, 51)
                    if not vehicle_name:
                        continue

                    chassis_no = get(row, 57) or None
                    manufacturer_name = get(row, 70)
                    category_name = get(row, 69)
                    color_name_val = get(row, 73)

                    manufacturer = manufacturer_map.get(manufacturer_name)
                    category = category_map.get(category_name)
                    color = color_map.get(color_name_val)

                    vehicle_defaults = {
                        "vehicle_name": vehicle_name,
                        "displacement": get_int(row, 52),
                        "model_year": get(row, 53) or None,
                        "model_code": get(row, 58) or None,
                        "new_car_type": get(row, 68) or None,
                        "engine_type": get(row, 60) or None,   # ⑤ 原動型
                        "manufacturer": manufacturer,
                        "category": category,
                        "color": color,
                        "color_name": color_name_val or None,
                        "color_code": get(row, 72) or None,
                    }

                    if not dry_run:
                        if chassis_no:
                            vehicle, created = Vehicle.objects.get_or_create(
                                chassis_no=chassis_no,
                                defaults=vehicle_defaults,
                            )
                        else:
                            vehicle = Vehicle.objects.create(**vehicle_defaults)
                            created = True

                        if created:
                            stats["vehicles_created"] += 1

                            # --- VehicleRegistration 作成 ---
                            reg_area  = get(row, 55)       # ③ 登録地
                            reg_no    = get(row, 105)      # ④ №ﾌﾟﾚｰﾄ
                            cert_no   = get(row, 59)       # ⑥ 型認番
                            first_reg = _first_registration_date(  # ⑦ 初登年+初登月
                                get(row, 82), get(row, 83)
                            )
                            inspection_exp = get_date(row, 77)  # ② 車検終

                            if any([reg_area, reg_no, cert_no, first_reg, inspection_exp]):
                                VehicleRegistration.objects.create(
                                    vehicle=vehicle,
                                    registration_area=reg_area or None,
                                    registration_no=reg_no or None,
                                    certification_no=cert_no or None,
                                    first_registration_date=first_reg,
                                    inspection_expiration=inspection_exp,
                                )

                            # --- 保険情報 作成 ---
                            # 自賠責：会社(col74) または 終了日(col79) があれば作成
                            jibai_company = get(row, 74) or None
                            jibai_end     = get_date(row, 79)
                            if jibai_company or jibai_end:
                                VehicleInsurance.objects.create(
                                    vehicle=vehicle,
                                    type="mandatory",
                                    company=jibai_company,
                                    end_date=jibai_end,
                                )

                            # 任意保険：会社(col75) または 終了日(col78) があれば作成
                            nin_company = get(row, 75) or None
                            nin_end     = get_date(row, 78)
                            if nin_company or nin_end:
                                VehicleInsurance.objects.create(
                                    vehicle=vehicle,
                                    type="optional",
                                    company=nin_company,
                                    end_date=nin_end,
                                )

                            # 車ﾒﾓ1-6 (col 94-99) を車両メモに追加
                            for memo_col in range(94, 100):
                                body = get(row, memo_col)
                                if body:
                                    VehicleMemo.objects.create(
                                        vehicle=vehicle,
                                        body=body,
                                        created_by=memo_user,
                                    )

                        # --- 所有関係の作成 ---
                        if customer:
                            owned_from = get_date(row, 76)

                            already_owns = CustomerVehicle.objects.filter(
                                customer=customer,
                                vehicle=vehicle,
                                owned_to__isnull=True,
                            ).exists()
                            if already_owns:
                                stats["cv_skipped"] += 1
                                continue

                            # 別の顧客が現所有していれば所有終了させる
                            CustomerVehicle.objects.filter(
                                vehicle=vehicle,
                                owned_to__isnull=True,
                            ).update(owned_to=owned_from or date.today(), is_current=False)

                            CustomerVehicle.objects.create(
                                customer=customer,
                                vehicle=vehicle,
                                owned_from=owned_from,
                                owned_to=None,
                                is_current=True,
                            )
                            stats["cv_created"] += 1
                    else:
                        self.stdout.write(
                            f"  [車両] {vehicle_name} (車体№: {chassis_no or 'なし'}) "
                            f"メーカー={manufacturer_name}→{'一致' if manufacturer else '不一致'} "
                            f"カテゴリ={category_name}→{'一致' if category else '不一致'} "
                            f"エンジン={get(row, 60) or 'なし'} "
                            f"初年度登録={_first_registration_date(get(row, 82), get(row, 83))}"
                        )
                        stats["vehicles_created"] += 1
                        stats["cv_created"] += 1

            except Exception as e:
                self.stderr.write(f"行 {i + 2} エラー: {e}")
                stats["skipped"] += 1

        mode = "[DRY RUN] " if dry_run else ""
        self.stdout.write(self.style.SUCCESS(
            f"\n{mode}完了:\n"
            f"  顧客 新規: {stats['customers_created']}  更新: {stats['customers_updated']}\n"
            f"  車両 作成: {stats['vehicles_created']}\n"
            f"  所有関係 作成: {stats['cv_created']}  スキップ(重複): {stats['cv_skipped']}\n"
            f"  行スキップ: {stats['skipped']}"
        ))
