// Shared Section and DetailItem components for VisitDetail (view/edit)
import React from "react";

export const Section = ({ icon: Icon, title, accent = "emerald", children }) => (
    <div className="enterprise-section">
        <div className="enterprise-section__header">
            <div className="flex items-center gap-3 min-w-0">
                <div className={`icon-box icon-box--${accent}`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <h2 className="section-title">{title}</h2>
            </div>
        </div>
        <div className="enterprise-section__body">{children}</div>
    </div>
);

export const DetailItem = ({ icon: Icon, label, children, span2 }) => (
    <div className={`detail-item ${span2 ? "col-span-2" : ""}`}>
        <div className="detail-item__label">
            {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
            <span>{label}</span>
        </div>
        <div className="detail-item__value">{children}</div>
    </div>
);
