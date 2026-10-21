import { verificationLabel, statusLabel } from "../../utils/attendance";

export function ActiveBadge({ active }) {
  return (
    <span
      className={`masters-admin-status ${
        active ? "masters-admin-status--active" : "masters-admin-status--inactive"
      }`}
    >
      <span className="masters-admin-status__dot" aria-hidden="true" />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/**
 * Distinguishes TEST_MANUAL attendance from verified attendance.
 * TEST_MANUAL is amber and explicit — never silently treated as real attendance.
 */
export function VerificationBadge({ method, isTest }) {
  if (isTest || method === "TEST_MANUAL") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200"
        title="Recorded in test mode by manual selection — not biometrically verified"
      >
        TEST / MANUAL
      </span>
    );
  }
  if (method === "BIOMETRIC") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        Biometric verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      {verificationLabel(method)}
    </span>
  );
}

export function AttendanceStatusBadge({ status }) {
  const tone =
    status === "PRESENT"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : status === "HALF_DAY"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}
