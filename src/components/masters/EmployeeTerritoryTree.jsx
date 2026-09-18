import { MapPin, Pencil, Trash2 } from "lucide-react";
import { nestAssignmentGroups } from "../../utils/employeeLocationAssignmentForm";

export default function EmployeeTerritoryTree({
  groups = [],
  emptyLabel = "No territory assigned to this employee",
  onEditTaluk,
  onRemoveVillage,
  onRemoveTaluk,
  onRemoveDistrict,
  readOnly = false,
}) {
  const nested = nestAssignmentGroups(groups);
  const canEdit = !readOnly && Boolean(onEditTaluk || onRemoveVillage || onRemoveTaluk || onRemoveDistrict);

  if (nested.length === 0) {
    return <p className="emp-territory-empty">{emptyLabel}</p>;
  }

  return (
    <ul className="emp-territory-tree">
      {nested.map((district) => (
        <li key={district.district_id} className="emp-territory-tree__district">
          <div className="emp-territory-tree__district-head">
            <p className="emp-territory-tree__district-name">{district.district_name}</p>
            {canEdit && onRemoveDistrict ? (
              <button
                type="button"
                className="emp-territory-tree__icon-btn"
                onClick={() => onRemoveDistrict(district)}
                aria-label={`Remove ${district.district_name}`}
                title="Remove district"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <ul className="emp-territory-tree__taluks">
            {district.taluks.map((taluk) => (
              <li key={taluk.taluk_id} className="emp-territory-tree__taluk">
                <div className="emp-territory-tree__taluk-head">
                  <p className="emp-territory-tree__taluk-name">{taluk.taluk_name}</p>
                  <span className="emp-territory-tree__count">
                    {taluk.villages.length} {taluk.villages.length === 1 ? "village" : "villages"}
                  </span>
                  {canEdit ? (
                    <div className="emp-territory-tree__taluk-actions">
                      {onEditTaluk ? (
                        <button
                          type="button"
                          className="emp-territory-tree__icon-btn"
                          onClick={() =>
                            onEditTaluk({
                              district_id: district.district_id,
                              district_name: district.district_name,
                              taluk_id: taluk.taluk_id,
                              taluk_name: taluk.taluk_name,
                              villages: taluk.villages,
                            })
                          }
                          aria-label={`Edit ${taluk.taluk_name}`}
                          title="Edit taluk villages"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      ) : null}
                      {onRemoveTaluk ? (
                        <button
                          type="button"
                          className="emp-territory-tree__icon-btn"
                          onClick={() => onRemoveTaluk(taluk, district)}
                          aria-label={`Remove ${taluk.taluk_name}`}
                          title="Remove taluk"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <ul className="emp-territory-tree__villages">
                  {taluk.villages.map((village) => (
                    <li key={village.id} className="emp-territory-tree__village">
                      <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span>{village.name || `Village ${village.id}`}</span>
                      {canEdit && onRemoveVillage ? (
                        <button
                          type="button"
                          className="emp-territory-tree__icon-btn"
                          onClick={() => onRemoveVillage(village, taluk, district)}
                          aria-label={`Remove ${village.name}`}
                          title="Remove village"
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
