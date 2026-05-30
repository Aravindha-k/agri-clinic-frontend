/** Compact Suspense fallback for dashboard widgets — does not block the page shell. */
export default function WidgetSuspenseFallback({ label = "Loading\u2026" }) {
  return (
    <div
      className="section-card flex items-center justify-center min-h-[180px] p-6 text-sm text-gray-500"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="inline-flex items-center gap-2.5">
        <span
          className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"
          aria-hidden="true"
        />
        {label}
      </span>
    </div>
  );
}
