import React from "react";

export function PageSpinner({ message = "Loading..." }) {
    return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center">
                <div className="relative mx-auto w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-600 animate-spin" />
                </div>
                <p className="mt-4 text-sm text-gray-500 font-medium">{message}</p>
            </div>
        </div>
    );
}

export function Loading({ className = "text-gray-500", message = "Loading..." }) {
    return (
        <div className={`flex items-center gap-3 ${className}`} role="status" aria-live="polite">
            <div className="w-5 h-5 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin" />
            <span className="text-sm font-medium">{message}</span>
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

export function EmptyState({ icon: Icon, title = "No data found", subtitle, action }) {
    return (
        <div className="bg-white rounded-2xl p-16 text-center" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)" }}>
            {Icon && (
                <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-5">
                    <Icon className="w-9 h-9 text-gray-300" />
                </div>
            )}
            <p className="text-base font-semibold text-gray-500">{title}</p>
            {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
            {action}
        </div>
    );
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
