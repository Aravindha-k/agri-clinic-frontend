import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Plus, Pencil, Users } from "lucide-react";
import { getEmployees, createEmployee, patchEmployee, toggleEmployeeStatus } from "../../api/employee.api";
import { unwrapResponse } from "../../api/axios";
import { Badge, TableSkeleton, EmptyState, Pagination } from "../../components/ui/DataTable";
import SlidePanel from "../../components/ui/SlidePanel";
import { useToast } from "../../components/ui/Toast";

const PER_PAGE = 15;
const ROLES = [
    { value: "field_agent", label: "Field Agent" },
    { value: "supervisor", label: "Supervisor" },
    { value: "district_admin", label: "District Admin" },
    { value: "super_admin", label: "Super Admin" },
];

export default function MasterEmployees() {
    const toast = useToast();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [panel, setPanel] = useState({ open: false, mode: "add", item: null });
    const [saving, setSaving] = useState(false);
    const debounceRef = useRef(null);

    /* ── fetch ── */
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await getEmployees();
            const records = unwrapResponse(result);
            setRows(Array.isArray(records) ? records : []);
        } catch (err) {
            setError(err?.response?.data?.detail || "Failed to load employees");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── debounced search ── */
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [search]);

    const q = debouncedSearch.toLowerCase();
    const filtered = rows.filter((r) =>
        (r.employee_id || "").toLowerCase().includes(q) ||
        (r.username || r.name || "").toLowerCase().includes(q) ||
        (r.phone || "").includes(q)
    );
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    /* ── toggle status ── */
    const toggleStatus = async (emp) => {
        try {
            await toggleEmployeeStatus(emp.id);
            toast(emp.is_active ? "Employee disabled" : "Employee enabled");
            fetchData();
        } catch { toast("Toggle failed", "error"); }
    };

    /* ── save ── */
    const handleSave = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const username = fd.get("username")?.trim();
        const employee_id = fd.get("employee_id")?.trim();
        const password = fd.get("password")?.trim();

        if (!username) { toast("Username is required", "error"); return; }
        if (!employee_id) { toast("Employee ID is required", "error"); return; }
        if (panel.mode === "add" && !password) { toast("Password is required", "error"); return; }

        const payload = {
            username,
            employee_id,
            phone: fd.get("phone"),
            role: fd.get("role"),
            is_active_employee: fd.get("is_active") === "on",
        };
        if (password) payload.password = password;
        try {
            setSaving(true);
            if (panel.mode === "edit") {
                await patchEmployee(panel.item.id, payload);
                toast("Employee updated");
            } else {
                await createEmployee(payload);
                toast("Employee created");
            }
            setPanel({ open: false, mode: "add", item: null });
            fetchData();
        } catch (err) {
            const status = err?.response?.status;
            const data = err?.response?.data;

            let errorMsg = "";

            if ((status === 400 || status === 409) && data) {
                if (data.message) {
                    errorMsg = data.message;
                } else if (data.name && Array.isArray(data.name)) {
                    errorMsg = data.name[0];
                } else if (typeof data === "string") {
                    errorMsg = data;
                } else if (data.detail) {
                    errorMsg = data.detail;
                } else if (typeof data === "object") {
                    errorMsg = Object.entries(data)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                        .join("; ")
                        .slice(0, 150);
                }
            } else if (data?.detail) {
                errorMsg = data.detail;
            }

            toast(errorMsg || "Save failed", "error");
        } finally { setSaving(false); }
    };

    /* ── error state ── */
    if (error && !loading && rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                    <Users className="w-7 h-7 text-red-400" />
                </div>
                <p className="text-gray-700 font-semibold text-lg">Unable to load employees</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">{error}</p>
                <button onClick={fetchData} className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
                    <p className="text-sm text-gray-500 mt-1">{filtered.length} employees</p>
                </div>
                <button onClick={() => setPanel({ open: true, mode: "add", item: null })} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition shadow-sm">
                    <Plus className="w-4 h-4" /> Add Employee
                </button>
            </div>

            {/* card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID or phone…" className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" />
                    </div>
                </div>

                {loading ? <TableSkeleton rows={8} cols={7} /> : paginated.length === 0 ? (
                    <EmptyState icon={Users} title="No employees found" subtitle="Try a different search or add a new employee" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Employee ID</th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Phone</th>
                                    <th className="px-4 py-3">District</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginated.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50/50 transition">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.employee_id || "—"}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{r.username || r.name || "—"}</td>
                                        <td className="px-4 py-3 text-gray-500">{r.phone || "—"}</td>
                                        <td className="px-4 py-3 text-gray-500">{r.district_name || r.district || "—"}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 capitalize">{(r.role || "—").replace("_", " ")}</span>
                                        </td>
                                        <td className="px-4 py-3"><Badge active={r.is_active !== false} /></td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <button onClick={() => setPanel({ open: true, mode: "edit", item: r })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-emerald-600 transition" title="Edit"><Pencil className="w-4 h-4" /></button>
                                                {/* toggle switch */}
                                                <button onClick={() => toggleStatus(r)} className={`relative w-9 h-5 rounded-full transition-colors ${r.is_active !== false ? "bg-emerald-500" : "bg-gray-300"}`} title={r.is_active !== false ? "Disable" : "Enable"}>
                                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${r.is_active !== false ? "translate-x-4" : ""}`} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="p-4 border-t border-gray-100">
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
            </div>

            {/* slide panel */}
            <SlidePanel open={panel.open} onClose={() => setPanel({ open: false, mode: "add", item: null })} title={panel.mode === "edit" ? "Edit Employee" : "Add Employee"}>
                <form onSubmit={handleSave} className="space-y-5" key={panel.item?.id || "new"}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username / Name</label>
                        <input name="username" required defaultValue={panel.item?.username || panel.item?.name || ""} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                        <input name="employee_id" defaultValue={panel.item?.employee_id || ""} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input name="phone" defaultValue={panel.item?.phone || ""} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select name="role" defaultValue={panel.item?.role || "field_agent"} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
                            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                    {panel.mode === "add" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input name="password" type="password" required={panel.mode === "add"} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <input type="checkbox" name="is_active" defaultChecked={panel.item?.is_active !== false} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                        <label className="text-sm text-gray-700">Active</label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={() => setPanel({ open: false, mode: "add", item: null })} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50">{panel.mode === "edit" ? "Update" : "Create"}</button>
                    </div>
                </form>
            </SlidePanel>
        </div>
    );
}
