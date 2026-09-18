import { useCallback, useEffect, useState } from "react";
import { Info } from "lucide-react";
import SlidePanel from "../ui/SlidePanel";
import ErrorRetry from "../ui/ErrorRetry";
import { PageLoader } from "../ui/command";
import { fetchEmployeeLocationAssignmentDetail } from "../../api/employeeLocationAssignments.api";
import { parseAssignedVillages } from "../../utils/employeeLocationAssignmentForm";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import EmployeeTerritoryTree from "./EmployeeTerritoryTree";

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
  const [groups, setGroups] = useState([]);

  const loadDetail = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const detail = await fetchEmployeeLocationAssignmentDetail(employee.id);
      setGroups(parseAssignedVillages(detail));
    } catch (err) {
      setLoadError(friendlyErrorMessage(err, "Could not load assigned locations."));
      setGroups([]);
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
      setGroups([]);
      setLoadError(null);
    }
  }, [open, employee?.id, loadDetail]);

  return (
    <SlidePanel open={open} onClose={onClose} title="Assigned Villages" wide tone="masters">
      <div className="emp-loc-drawer emp-loc-view-drawer">
        <header className="emp-loc-drawer__hero">
          <div>
            <p className="emp-loc-drawer__name">{empDisplayName(employee)}</p>
            <p className="emp-loc-drawer__meta">{employee?.employee_id || "\u2014"}</p>
          </div>
        </header>

        <div className="emp-loc-drawer__note" role="note">
          <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
          <p>Read-only view of assigned villages. Use Manage Villages to edit.</p>
        </div>

        {loading ? (
          <PageLoader label="Loading assigned villages…" />
        ) : loadError ? (
          <ErrorRetry message={loadError} onRetry={loadDetail} />
        ) : (
          <EmployeeTerritoryTree villages={groups} readOnly />
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
