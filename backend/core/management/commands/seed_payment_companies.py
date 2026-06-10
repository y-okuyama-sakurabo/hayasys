# core/management/commands/seed_payment_companies.py
from django.core.management.base import BaseCommand
from core.models.payment_company import PaymentCompany

COMPANIES = {
    "loan": [
        "ジャックス", "セディナ", "オリコ", "日立", "パルコ",
        "ギフトカード", "タピオ", "日専連", "アプラス", "イオン", "KTMクーポン",
    ],
    "card": [
        "JCB", "ビザ・マスター", "オリコ", "ジャックス", "日専連", "NICOS",
        "地域商品券", "BASE", "ダイナース", "AMEX", "セディナ", "Stripe",
        "楽天カード", "SAISON", "QUICPay", "ジェイデビッド", "楽天Pay",
        "楽アールカード", "警友共済互助", "電子マネー", "その他QR", "ID",
        "paypay", "d払い", "クーポン", "クレジットカード",
    ],
    "qr": [
        "QUICPay", "ジェイデビッド", "楽天Pay", "楽アールカード",
        "電子マネー", "その他QR", "ID", "paypay", "d払い",
    ],
}


class Command(BaseCommand):
    help = "Seed payment companies"

    def handle(self, *args, **kwargs):
        for payment_type, names in COMPANIES.items():
            for i, name in enumerate(names):
                PaymentCompany.objects.get_or_create(
                    name=name,
                    payment_type=payment_type,
                    defaults={"sort_order": i},
                )
        self.stdout.write(self.style.SUCCESS("Payment companies seeded"))
