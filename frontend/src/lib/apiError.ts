/**
 * Axios エラーから DRF のエラーメッセージを抽出して人間が読める文字列にする。
 *
 * DRF のレスポンス例:
 *   { "detail": "..." }
 *   { "non_field_errors": ["..."] }
 *   { "field_name": ["error message", ...] }
 *   "文字列"
 */
export function extractApiError(e: unknown, fallback = "保存に失敗しました"): string {
  const data = (e as any)?.response?.data;
  if (!data) return fallback;

  if (typeof data === "string") return data;

  if (typeof data === "object" && !Array.isArray(data)) {
    const messages: string[] = [];

    for (const [key, val] of Object.entries(data)) {
      const label = key === "detail" || key === "non_field_errors" ? "" : `${key}: `;
      if (Array.isArray(val)) {
        messages.push(`${label}${val.join(" / ")}`);
      } else if (typeof val === "string") {
        messages.push(`${label}${val}`);
      }
    }

    if (messages.length > 0) return messages.join("\n");
  }

  if (Array.isArray(data)) return data.join("\n");

  return fallback;
}
