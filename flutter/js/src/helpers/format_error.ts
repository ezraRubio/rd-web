/** Normalize thrown values / API errors into a user-facing string. */
export function formatErrorMessage(
  value: unknown,
  fallback = "An unknown error occurred.",
): string {
  if (value == null || value === "") return fallback;
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message || fallback;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message) return obj.message;
    if (typeof obj.reason === "string" && obj.reason) return obj.reason;
    if (typeof obj.text === "string" && obj.text) return obj.text;
  }
  const s = String(value);
  return s === "[object Object]" ? fallback : s;
}
