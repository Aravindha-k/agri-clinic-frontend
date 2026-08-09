/**
 * Clipboard helpers with secure-context + legacy DOM fallback.
 * Never logs clipboard contents.
 */

function legacyCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.tabIndex = -1;
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);
  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const ok = document.execCommand("copy");
    return Boolean(ok);
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

/**
 * Copy plain text to the clipboard.
 * @param {string} text
 * @returns {Promise<boolean>} true if copied
 */
export async function copyTextToClipboard(text) {
  const value = String(text ?? "");
  if (!value) return false;

  const canUseClipboardApi =
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function";

  if (canUseClipboardApi) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to legacy DOM copy (common on non-secure HTTP origins).
    }
  }

  return legacyCopyText(value);
}
