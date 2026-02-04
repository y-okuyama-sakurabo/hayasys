import jaconv
import re

def normalize_japanese(text: str) -> str:
    if not text:
        return ""

    text = text.lower()

    # 全角 → 半角（英数）
    text = jaconv.z2h(text, ascii=True, digit=True)

    # カタカナ → ひらがな
    text = jaconv.kata2hira(text)

    # 記号除去（必要に応じて調整）
    text = re.sub(r"[^\wぁ-ん]", "", text)

    return text
