/** Mirrors backend employee password policy (accounts/password_policy.py). */

export const PASSWORD_MIN_LENGTH = 8;

const RULE_TESTS = {
  minLength: (password) => (password ?? "").length >= PASSWORD_MIN_LENGTH,
  uppercase: (password) => /[A-Z]/.test(password ?? ""),
  lowercase: (password) => /[a-z]/.test(password ?? ""),
  number: (password) => /\d/.test(password ?? ""),
  special: (password) => /[^A-Za-z0-9]/.test(password ?? ""),
};

export const PASSWORD_RULE_DEFINITIONS = [
  { id: "minLength", label: "At least 8 characters" },
  { id: "uppercase", label: "One uppercase letter" },
  { id: "lowercase", label: "One lowercase letter" },
  { id: "number", label: "One number" },
  { id: "special", label: "One special character" },
];

/** Per-rule pass/fail for live checklist UI. */
export function checkPasswordPolicy(password) {
  const value = password ?? "";
  return PASSWORD_RULE_DEFINITIONS.map(({ id, label }) => ({
    id,
    label,
    met: RULE_TESTS[id](value),
  }));
}

export function allPasswordRulesMet(password) {
  return checkPasswordPolicy(password).every((rule) => rule.met);
}

export function passwordsMatch(password, confirmPassword) {
  const primary = password ?? "";
  const confirm = confirmPassword ?? "";
  return primary.length > 0 && primary === confirm;
}

function firstString(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = firstString(item);
      if (parsed) return parsed;
    }
  }
  if (value && typeof value === "object" && typeof value.message === "string") {
    return value.message.trim();
  }
  return "";
}

/** User-facing admin reset error — never includes submitted password text. */
export function adminResetPasswordErrorMessage(
  err,
  fallback = "Failed to update password."
) {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;

  const fromField =
    firstString(data.errors?.new_password) ||
    firstString(data.new_password) ||
    firstString(data.errors?.password) ||
    firstString(data.password);

  if (fromField) return fromField;

  const fromEnvelope =
    firstString(data.message) ||
    firstString(data.detail) ||
    firstString(data.error?.message);

  return fromEnvelope || fallback;
}
