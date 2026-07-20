import { useNavigate } from "react-router-dom";
import { MapPin, Wheat, Tag, Bug, ChevronRight, Database } from "lucide-react";

const MASTER_SECTIONS = [
    {
        title: "Locations",
        description: "Manage districts and villages",
        icon: MapPin,
        color: "#0f766e",
        bg: "linear-gradient(160deg,#f0fdfa 0%,#ccfbf1 100%)",
        iconBg: "#99f6e4",
        path: "/masters/locations",
    },
    {
        title: "Crops",
        description: "Manage crop types, varieties & seasons",
        icon: Wheat,
        color: "#b45309",
        bg: "linear-gradient(160deg,#fffbeb 0%,#fef3c7 100%)",
        iconBg: "#fde68a",
        path: "/masters/crops",
    },
    {
        title: "Problem Categories",
        description: "Pest, disease, nutrient & other types",
        icon: Tag,
        color: "#7c3aed",
        bg: "linear-gradient(160deg,#f5f3ff 0%,#ede9fe 100%)",
        iconBg: "#ddd6fe",
        path: "/masters/problem-categories",
    },
    {
        title: "Problem Items",
        description: "Pest, disease & nutrient dropdown options",
        icon: Bug,
        color: "#c2410c",
        bg: "linear-gradient(160deg,#fff7ed 0%,#ffedd5 100%)",
        iconBg: "#fdba74",
        path: "/masters/problem-items",
    },
];

export default function Masters() {
    const navigate = useNavigate();

    return (
        <div className="masters-admin page-container">
            <header className="masters-admin-header">
                <div className="masters-admin-header__inner">
                    <div className="masters-admin-header__brand">
                        <div className="masters-admin-header__icon" aria-hidden="true">
                            <Database className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="masters-admin-header__badge">
                                <Database className="w-3 h-3" aria-hidden="true" />
                                Reference data
                            </span>
                            <h1 className="masters-admin-header__title">Master Data</h1>
                            <p className="masters-admin-header__subtitle">
                                Manage reference data used across visits, farmers, and field operations
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="masters-admin-hub-grid">
                {MASTER_SECTIONS.map((section) => (
                    <button
                        key={section.path}
                        type="button"
                        onClick={() => navigate(section.path)}
                        className="masters-admin-hub-card group"
                        style={{ background: section.bg }}
                    >
                        <div className="flex items-start justify-between">
                            <div
                                className="masters-admin-hub-card__icon"
                                style={{ background: section.iconBg }}
                            >
                                <section.icon className="w-4 h-4" style={{ color: section.color }} aria-hidden="true" />
                            </div>
                            <ChevronRight className="masters-admin-hub-card__arrow" aria-hidden="true" />
                        </div>
                        <h3 className="masters-admin-hub-card__title">{section.title}</h3>
                        <p className="masters-admin-hub-card__desc">{section.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
