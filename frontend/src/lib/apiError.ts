/**
 * Axios エラーから DRF のエラーメッセージを抽出して人間が読める文字列にする。
 *
 * DRF のレスポンス例:
 *   { "detail": "..." }
 *   { "non_field_errors": ["..."] }
 *   { "field_name": ["error message", ...] }
 *   { "payment": { "credit_company": ["信販会社は必須です"] } }  ← ネスト
 *   "文字列"
 */
function flattenErrors(val: unknown): string[] {
  if (typeof val === "string") return [val];
  if (Array.isArray(val)) return val.flatMap((v) => flattenErrors(v));
  if (val && typeof val === "object") {
    return Object.entries(val).flatMap(([, v]) => flattenErrors(v));
  }
  return [];
}

const SKIP_LABEL_KEYS = new Set(["detail", "non_field_errors"]);

function collectMessages(data: Record<string, unknown>): string[] {
  const messages: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    const skipLabel = SKIP_LABEL_KEYS.has(key);
    const label = skipLabel ? "" : `${key}: `;
    const lines = flattenErrors(val);
    if (lines.length > 0) {
      messages.push(`${label}${lines.join(" / ")}`);
    }
  }
  return messages;
}

export function extractApiError(e: unknown, fallback = "保存に失敗しました"): string {
  const data = (e as any)?.response?.data;
  if (!data) return fallback;

  if (typeof data === "string") return data;

  if (Array.isArray(data)) return data.join("\n");

  if (typeof data === "object") {
    const messages = collectMessages(data as Record<string, unknown>);
    if (messages.length > 0) return messages.join("\n");
  }

  return fallback;
}
