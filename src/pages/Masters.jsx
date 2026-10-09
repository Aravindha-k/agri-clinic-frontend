import { useEffect, useState } from "react";
import { PageHeader } from "../components/ui/command";
import { PageCanvas } from "../components/motion/Cinematic";
import { Link } from "react-router-dom";
import { ChevronRight, MapPin, MapPinned, Wheat } from "lucide-react";
import { getCropPestDiseaseList } from "../api/cropPestDisease.api";
import { fetchLocationSummary } from "../api/master.api";
import { fetchEmployeeLocationAssignments } from "../api/employeeLocationAssignments.api";

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
        statKey: "crops",
    },
    {
        title: "Village Master",
        desc: "Manage villages for employee territories, farmers and visits",
        path: "/masters/locations",
        icon: MapPin,
        tint: "teal",
        statKey: "villages",
    },
    {
        title: "Employee Territories",
        desc: "Assign villages and operational areas to field employees",
        path: "/masters/employee-locations",
        icon: MapPinned,
        tint: "forest",
        statKey: "employees",
    },
];

export default function Masters() {
    const [stats, setStats] = useState({ crops: null, villages: null, employees: null });

    useEffect(() => {
        let active = true;
        const safe = (promise, key, pick) =>
            promise
                .then((res) => {
                    if (!active) return;
                    const n = pick(res);
                    if (typeof n === "number" && Number.isFinite(n)) {
                        setStats((prev) => (prev[key] === n ? prev : { ...prev, [key]: n }));
                    }
                })
                .catch(() => {
                    /* hub stats are decorative — hide on failure */
                });

        safe(getCropPestDiseaseList({ is_active: true, page_size: 1 }), "crops", (r) => r?.count);
        safe(fetchLocationSummary(), "villages", (r) => r?.villages);
        safe(
            fetchEmployeeLocationAssignments({ page_size: 1 }),
            "employees",
            (r) => r?.count,
        );
        return () => {
            active = false;
        };
    }, []);

    return (
        <PageCanvas className="masters-admin">
            <PageHeader
                title="Master Data"
                subtitle="Crops, villages and field territories that power daily operations"
            />

            <div className="masters-admin-hub-grid" role="list">
                {MASTER_SECTIONS.map(
                    ({ title, desc, path, icon: Icon, tint, statKey }) => (
                        <Link
                            key={path}
                            to={path}
                            className="masters-admin-hub-card"
                            role="listitem"
                        >
                            <div className={`raised-icon-well raised-icon-well--${tint} masters-admin-hub-card__icon`}>
                                <Icon strokeWidth={2.25} aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="masters-admin-hub-card__title">{title}</h3>
                                <p className="masters-admin-hub-card__desc">{desc}</p>
                                {typeof stats[statKey] === "number" ? (
                                    <p className={`masters-admin-hub-card__stat masters-admin-hub-card__stat--${tint}`}>
                                        <strong className="tabular-nums">{stats[statKey]}</strong>
                                        {statKey === "crops"
                                            ? " active crops"
                                            : statKey === "villages"
                                              ? " villages"
                                              : " employees"}
                                    </p>
                                ) : null}
                            </div>
                            <span className={`masters-admin-hub-card__action masters-admin-hub-card__action--${tint}`} aria-hidden="true">
                                <ChevronRight className="w-4 h-4" strokeWidth={2.25} />
                            </span>
                        </Link>
                    ),
                )}
            </div>
        </PageCanvas>
    );
}
