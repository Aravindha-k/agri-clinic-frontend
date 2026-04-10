import { X } from "lucide-react";
import { createPortal } from "react-dom";

export default function SlidePanel({ open, onClose, title, wide, children }) {
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9997] flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div
                className={`relative bg-white shadow-2xl h-full overflow-y-auto ${wide ? "w-full max-w-2xl" : "w-full max-w-lg"}`}
            >
                <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>,
        document.body
    );
}
