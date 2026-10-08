import { PageHeader } from "../components/ui/command";
import { Link } from "react-router-dom";
import { ChevronRight, MapPin, MapPinned, Wheat } from "lucide-react";

/**
 * Masters hub — canonical business-facing sections only.
 *
 * Legacy Problem Category and global Problem Master pages stay registered
 * under /masters/problem-* for internal/ops use (Excel import, debugging,
 * Visit compatibility) but are intentionally not linked from this hub.
 */

const MASTER_SECTIONS = [
    {
        title: "Crop / Pest / Disease Master",
        desc: "Manage crops and their Pest & Disease mappings",
        path: "/masters/crops",
        icon: Wheat,
        tint: "emerald",
    },
    {
        title: "Village Master",
        desc: "Manage villages for employee territories, farmers and visits",
        path: "/masters/locations",
        icon: MapPin,
        tint: "teal",
    },
    {
        title: "Employee Territories",
        desc: "Assign villages and operational areas to field employees",
        path: "/masters/employee-locations",
        icon: MapPinned,
        tint: "forest",
    },
];

export default function Masters() {
    return (
        <div className="masters-admin">
            <PageHeader
                title="Master Data"
                subtitle="Crops, villages and field territories that power daily operations"
            />

            <div className="masters-admin-hub-grid" role="list">
                {MASTER_SECTIONS.map(
                    ({ title, desc, path, icon: Icon, tint }) => (
                        <Link
                            key={path}
                            to={path}
                            className="masters-admin-hub-card"
                            role="listitem"
                        >
                            <div className={`raised-icon-well raised-icon-well--${tint} masters-admin-hub-card__icon`}>
                                <Icon strokeWidth={2.25} aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="masters-admin-hub-card__title">{title}</h3>
                                <p className="masters-admin-hub-card__desc">{desc}</p>
                            </div>
                            <span className={`masters-admin-hub-card__action masters-admin-hub-card__action--${tint}`}>
                                Manage
                                <ChevronRight className="w-4 h-4" strokeWidth={2.25} aria-hidden="true" />
                            </span>
                        </Link>
                    ),
                )}
            </div>
        </div>
    );
}
