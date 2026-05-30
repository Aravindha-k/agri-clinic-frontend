import { AlertCircle, RefreshCw } from "lucide-react";

/** Friendly inline error banner with retry — not harsh browser-style alerts. */
export default function ErrorRetry({
  message = "We couldn't load this right now. Please try again.",
  onRetry,
  className = "",
  compact = false,
}) {
  if (compact) {
    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl border border-amber-200/80 bg-amber-50/90 text-amber-950 ${className}`}
        role="alert"
      >
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm font-medium leading-snug">{message}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn btn-secondary btn-sm flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`section-card flex flex-col items-center justify-center py-10 px-6 text-center ${className}`}
      role="alert"
    >
      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-amber-600" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-gray-800 max-w-md">{message}</p>
      <p className="text-xs text-gray-500 mt-1 max-w-sm">
        This is usually temporary. Refresh or try again in a moment.
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 btn btn-primary btn-md focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
