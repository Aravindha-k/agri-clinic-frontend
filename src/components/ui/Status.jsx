import React from "react";
import AgriLoader from "./command/AgriLoader";
import CanonicalEmptyState from "./command/EmptyState";

export function PageSpinner({ message = "Loading…" }) {
  return (
    <div className="page-loader page-loader--inline">
      <AgriLoader label={message} size="md" />
    </div>
  );
}

export function Loading({ className = "", message = "Loading…" }) {
  return (
    <div className={`flex items-center justify-center py-6 ${className}`.trim()} role="status" aria-live="polite">
      <AgriLoader label={message} size="sm" />
    </div>
  );
}

export function ErrorMessage({ error, onRetry }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span className="font-medium flex-1">{error || "Something went wrong"}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-auto font-semibold text-red-600 hover:text-red-800 hover:underline transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState(props) {
  return <CanonicalEmptyState {...props} />;
}

export function TableSkeleton({ cols = 5, rows = 8 }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)" }}>
      <div className="p-5 border-b border-gray-100">
        <div className="animate-pulse bg-gray-200 rounded-lg w-40 h-5" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
          <div className="animate-pulse bg-gray-200 w-8 h-8 rounded-full" />
          {Array.from({ length: cols - 1 }).map((_, j) => (
            <div key={j} className={`animate-pulse bg-gray-200 rounded-lg h-4 ${j === 0 ? "w-28" : j === 1 ? "w-20" : "w-16"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
