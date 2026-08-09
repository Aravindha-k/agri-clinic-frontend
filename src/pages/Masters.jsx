import { useNavigate } from "react-router-dom";
import { MapPin, Wheat, Tag, Bug, ChevronRight, Database } from "lucide-react";
import { PageHeader } from "../components/ui/command";

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
        color: "#1E8449",
        bg: "linear-gradient(160deg,#ecfdf5 0%,#d1fae5 100%)",
        iconBg: "#a7f3d0",
        path: "/masters/crops",
    },
    {
        title: "Problem Categories",
        description: "Pest, disease, nutrient & other types",
        icon: Tag,
        color: "#0e7490",
        bg: "linear-gradient(160deg,#ecfeff 0%,#cffafe 100%)",
        iconBg: "#a5f3fc",
        path: "/masters/problem-categories",
    },
    {
        title: "Problem Items",
        description: "Pest, disease & nutrient dropdown options",
        icon: Bug,
        color: "#b45309",
        bg: "linear-gradient(160deg,#fffbeb 0%,#fef3c7 100%)",
        iconBg: "#fde68a",
        path: "/masters/problem-items",
    },
];

export default function Masters() {
    const navigate = useNavigate();

    return (
        <div className="masters-admin page-container">
            <PageHeader
                title="Master Data"
                subtitle="Manage reference data used across visits, farmers, and field operations"
                badge={
                    <span className="masters-admin-header__badge">
                        <Database className="w-3 h-3" aria-hidden="true" />
                        Reference data
                    </span>
                }
            />

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
