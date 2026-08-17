import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, Loader2, MapPin } from "lucide-react";
import SlidePanel from "../ui/SlidePanel";
import ErrorRetry from "../ui/ErrorRetry";
import { PageLoader } from "../ui/command";
import { fetchEmployeeLocationAssignmentDetail } from "../../api/employeeLocationAssignments.api";
import { friendlyErrorMessage } from "../../utils/friendlyError";

function empDisplayName(employee) {
  if (!employee) return "\u2014";
  return (
    employee.display_name ||
    [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
    employee.username ||
    employee.employee_id
  );
}

export default function EmployeeLocationViewDrawer({ open, employee, onClose }) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [assignments, setAssignments] = useState([]);

  const loadDetail = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const detail = await fetchEmployeeLocationAssignmentDetail(employee.id);
      setAssignments(detail?.assignments || []);
    } catch (err) {
      setLoadError(friendlyErrorMessage(err, "Could not load assigned locations."));
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    if (open && employee?.id) {
      loadDetail();
      return;
    }
    if (!open) {
      setAssignments([]);
      setLoadError(null);
    }
  }, [open, employee?.id, loadDetail]);

  const groupedByDistrict = useMemo(() => {
    const map = new Map();
    for (const group of assignments) {
      const district = group?.district;
      const taluk = group?.taluk;
      const villages = Array.isArray(group?.villages) ? group.villages : [];
      if (!district?.name || villages.length === 0) continue;

      if (!map.has(district.id)) {
        map.set(district.id, { district, taluks: [] });
      }
      map.get(district.id).taluks.push({ taluk, villages });
    }

    return [...map.values()].sort((a, b) =>
      a.district.name.localeCompare(b.district.name, undefined, { sensitivity: "base" })
    );
  }, [assignments]);

  const hasAssignments = groupedByDistrict.length > 0;

  return (
    <SlidePanel open={open} onClose={onClose} title="Assigned Locations" wide tone="masters">
      <div className="emp-loc-drawer emp-loc-view-drawer">
        <header className="emp-loc-drawer__hero">
          <div>
            <p className="emp-loc-drawer__name">{empDisplayName(employee)}</p>
            <p className="emp-loc-drawer__meta">{employee?.employee_id || "\u2014"}</p>
          </div>
        </header>

        <div className="emp-loc-drawer__note" role="note">
          <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
          <p>Read-only reference view. Use Manage to edit assignments.</p>
        </div>

        {loading ? (
          <PageLoader label="Loading assigned locations…" />
        ) : loadError ? (
          <ErrorRetry message={loadError} onRetry={loadDetail} />
        ) : !hasAssignments ? (
          <p className="emp-loc-empty">No locations assigned.</p>
        ) : (
          <div className="emp-loc-view-tree">
            <h3 className="emp-loc-drawer__section-title">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              Location hierarchy
            </h3>
            <ul className="emp-loc-view-tree__districts">
              {groupedByDistrict.map(({ district, taluks }) => (
                <li key={district.id} className="emp-loc-view-tree__district">
                  <p className="emp-loc-view-tree__district-name">{district.name}</p>
                  <ul className="emp-loc-view-tree__taluks">
                    {taluks
                      .sort((a, b) =>
                        (a.taluk?.name || "").localeCompare(b.taluk?.name || "", undefined, {
                          sensitivity: "base",
                        })
                      )
                      .map(({ taluk, villages }) => (
                        <li
                          key={taluk?.id ?? `${district.id}-taluk`}
                          className="emp-loc-view-tree__taluk"
                        >
                          {taluk?.name && (
                            <p className="emp-loc-view-tree__taluk-name">{taluk.name}</p>
                          )}
                          <ul className="emp-loc-view-tree__villages">
                            {villages.map((village) => (
                              <li key={village.id ?? village.name}>{village.name}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="emp-loc-drawer__foot">
          <button type="button" className="btn btn-secondary btn-md" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </SlidePanel>
  );
}
