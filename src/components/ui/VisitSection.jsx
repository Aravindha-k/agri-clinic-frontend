// Shared Section and DetailItem components for VisitDetail (view/edit)
import React from "react";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

export const Section = ({ icon: Icon, title, accent = "emerald", children }) => (
    <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ boxShadow: SHADOW, border: "1px solid rgba(0,0,0,0.04)" }}>
        <div className={`px-6 py-4 border-b border-gray-100 flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-xl bg-${accent}-50 flex items-center justify-center`}>
                <Icon className={`w-4.5 h-4.5 text-${accent}-600`} />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

export const DetailItem = ({ icon: Icon, label, children, span2 }) => (
    <div className={`bg-gray-50 rounded-xl p-3.5 ${span2 ? "col-span-2" : ""}`}>
        <div className="flex items-center gap-1.5 mb-1">
            {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{label}</span>
        </div>
        {children}
    </div>
);
