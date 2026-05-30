/** User-friendly messages — never expose raw API dumps in the UI. */
export function friendlyErrorMessage(
  err,
  fallback = "We couldn't load this right now. Please try again."
) {
  if (!err) return fallback;
  const raw =
    typeof err === "string"
      ? err
      : err?.message || err?.response?.data?.detail || "";

  const text = String(raw).trim();
  if (!text || text === "[object Object]" || text.length > 140) return fallback;

  if (/network|timeout|unavailable|ECONNREFUSED|failed to fetch|backend unavailable/i.test(text)) {
    return "Connection issue. Check your network and try again.";
  }
  if (/401|403|unauthorized|forbidden|permission/i.test(text)) {
    return "You don't have permission to view this data.";
  }
  if (/500|502|503|server error|internal/i.test(text)) {
    return "Our servers had a hiccup. Please try again in a moment.";
  }
  if (/invalid username|invalid password|credentials|login/i.test(text)) {
    return "Invalid username or password. Please check and try again.";
  }
  return text;
}
