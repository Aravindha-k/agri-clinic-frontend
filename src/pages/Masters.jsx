import { useNavigate } from "react-router-dom";
import { MapPin, Wheat, TreePine, Tag, ChevronRight, Database } from "lucide-react";

const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)";

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
        description: "Crop disease & issue classifications",
        icon: Tag,
        color: "#7c3aed",
        bg: "linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%)",
        iconBg: "#ddd6fe",
        path: "/masters/problem-categories",
    },
];

export default function Masters() {
    const navigate = useNavigate();

    return (
        <div className="page-container max-w-5xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Database className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Master Data</h1>
                    <p className="text-sm text-gray-500">Manage reference data used across the system</p>
                </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {MASTER_SECTIONS.map((section) => (
                    <button
                        key={section.path}
                        onClick={() => navigate(section.path)}
                        className="text-left rounded-2xl p-6 group transition-all hover:-translate-y-0.5 hover:shadow-lg"
                        style={{ background: section.bg, boxShadow: SHADOW }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center"
                                style={{ background: section.iconBg }}
                            >
                                <section.icon className="w-5 h-5" style={{ color: section.color }} />
                            </div>
                            <ChevronRight
                                className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all"
                            />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{section.title}</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">{section.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}

