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
        className={`error-retry-compact ${className}`}
        role="alert"
      >
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-snug">{message}</p>
        </div>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm flex-shrink-0">
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
      <div className="error-retry-card__icon">
        <AlertCircle className="w-6 h-6 text-amber-600" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-gray-800 max-w-md">{message}</p>
      <p className="text-xs text-gray-500 mt-1 max-w-sm">
        This is usually temporary. Refresh or try again in a moment.
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-5 btn btn-primary btn-md">
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
