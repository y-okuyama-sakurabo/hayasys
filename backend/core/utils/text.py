import unicodedata
import jaconv
import re


def normalize_japanese(text: str) -> str:
    if not text:
        return ""

    # ① Unicode正規化（最重要）
    text = unicodedata.normalize("NFKC", text)

    # ② 英数字は小文字
    text = text.lower()

    # ③ 半角カナ → 全角カナ
    text = jaconv.h2z(text, kana=True, digit=False, ascii=False)

    # ④ ひらがな → カタカナ（業務的にこっちが強い）
    text = jaconv.hira2kata(text)

    # ⑤ 不要記号削除（ゆるめ）
    text = re.sub(r"[^\wァ-ンー]", "", text)

    return text