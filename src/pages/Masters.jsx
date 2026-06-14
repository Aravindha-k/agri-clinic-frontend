import { useNavigate } from "react-router-dom";
import { MapPin, Wheat, Tag, Bug, ChevronRight } from "lucide-react";
import { PageHeader } from "../components/ui/command";

const MASTER_SECTIONS = [
    {
        title: "Locations",
        description: "Manage districts and villages",
        icon: MapPin,
        color: "#166534",
        bg: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)",
        iconBg: "#bbf7d0",
        path: "/masters/locations",
    },
    {
        title: "Crops",
        description: "Manage crop types, varieties & seasons",
        icon: Wheat,
        color: "#92400e",
        bg: "linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)",
        iconBg: "#fde68a",
        path: "/masters/crops",
    },
    {
        title: "Problem Categories",
        description: "Pest, disease, nutrient & other types",
        icon: Tag,
        color: "#7c3aed",
        bg: "linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%)",
        iconBg: "#ddd6fe",
        path: "/masters/problem-categories",
    },
    {
        title: "Problem Items",
        description: "Pest, disease & nutrient dropdown options",
        icon: Bug,
        color: "#b45309",
        bg: "linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)",
        iconBg: "#fde68a",
        path: "/masters/problem-items",
    },
];

export default function Masters() {
    const navigate = useNavigate();

    return (
        <div className="page-container">
            <PageHeader
                title="Master Data"
                subtitle="Manage reference data used across the system"
            />

            <div className="masters-hub-grid">
                {MASTER_SECTIONS.map((section) => (
                    <button
                        key={section.path}
                        type="button"
                        onClick={() => navigate(section.path)}
                        className="masters-hub-card group"
                        style={{ background: section.bg }}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center"
                                style={{ background: section.iconBg }}
                            >
                                <section.icon className="w-4 h-4" style={{ color: section.color }} />
                            </div>
                            <ChevronRight
                                className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all"
                            />
                        </div>
                        <h3 className="masters-hub-card__title">{section.title}</h3>
                        <p className="masters-hub-card__desc">{section.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}

