import { MapPin, Trash2 } from "lucide-react";
import { villageTamilName } from "../../utils/employeeLocationAssignmentForm";

export default function EmployeeTerritoryTree({
  villages = [],
  emptyLabel = "No villages assigned to this employee.",
  onRemoveVillage,
  readOnly = false,
}) {
  const list = Array.isArray(villages) ? villages : [];
  const canEdit = !readOnly && Boolean(onRemoveVillage);

  if (list.length === 0) {
    return <p className="emp-territory-empty">{emptyLabel}</p>;
  }

  return (
    <ul className="emp-territory-village-flat">
      {list.map((village) => {
        const tamil = villageTamilName(village);
        return (
          <li key={village.id} className="emp-territory-village-flat__row">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="emp-territory-village-flat__name">{village.name}</p>
              {tamil ? <p className="emp-territory-village-flat__tamil">{tamil}</p> : null}
            </div>
            {canEdit ? (
              <button
                type="button"
                className="emp-territory-tree__icon-btn"
                onClick={() => onRemoveVillage(village)}
                aria-label={`Remove ${village.name}`}
                title="Remove village"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
