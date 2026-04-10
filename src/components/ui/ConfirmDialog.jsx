import { AlertTriangle, X } from "lucide-react";
import { createPortal } from "react-dom";

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading, variant = "danger" }) {
    if (!open) return null;

    const btnClass =
        variant === "danger"
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-emerald-600 hover:bg-emerald-700 text-white";

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <button onClick={onCancel} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100">
                    <X className="w-4 h-4 text-gray-400" />
                </button>
                <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-xl ${variant === "danger" ? "bg-red-50" : "bg-emerald-50"}`}>
                        <AlertTriangle className={`w-6 h-6 ${variant === "danger" ? "text-red-500" : "text-emerald-500"}`} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        <p className="mt-1 text-sm text-gray-500">{message}</p>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition disabled:opacity-50 flex items-center gap-2 ${btnClass}`}
                    >
                        {loading && (
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        )}
                        Confirm
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
