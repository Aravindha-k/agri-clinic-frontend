import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { getDistricts, createDistrict, updateDistrict, deleteDistrict } from "../../api/master.api";
import { unwrapResponse } from "../../api/axios";
import { Badge, TableSkeleton, EmptyState, Pagination } from "../../components/ui/DataTable";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";

const PER_PAGE = 15;

export default function MasterDistricts() {
    const toast = useToast();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    /* panel / dialog state */
    const [panel, setPanel] = useState({ open: false, mode: "add", item: null });
    const [confirm, setConfirm] = useState({ open: false, item: null });
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getDistricts();
            const records = unwrapResponse(res.data);
            setRows(Array.isArray(records) ? records : []);
        } catch (err) {
            toast("Failed to load districts", "error");
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* filter + paginate */
    const filtered = rows.filter((r) =>
        (r.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.code || "").toLowerCase().includes(search.toLowerCase())
    );
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    /* save */
    const handleSave = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = { name: fd.get("name"), code: fd.get("code"), is_active: fd.get("is_active") === "on" };
        try {
            setSaving(true);
            if (panel.mode === "edit") {
                await updateDistrict(panel.item.id, payload);
                toast("District updated");
            } else {
                await createDistrict(payload);
                toast("District created");
            }
            setPanel({ open: false, mode: "add", item: null });
            fetchData();
        } catch (err) {
            toast(err?.response?.data?.detail || "Save failed", "error");
        } finally {
            setSaving(false);
        }
    };

    /* delete */
    const handleDelete = async () => {
        try {
            setSaving(true);
            await deleteDistrict(confirm.item.id);
            toast("District deleted");
            setConfirm({ open: false, item: null });
            fetchData();
        } catch (err) {
            toast("Delete failed", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Districts</h1>
                    <p className="text-sm text-gray-500 mt-1">{filtered.length} records</p>
                </div>
                <button
                    onClick={() => setPanel({ open: true, mode: "add", item: null })}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add District
                </button>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Search bar */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search districts…"
                            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                        />
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <TableSkeleton rows={8} cols={4} />
                ) : paginated.length === 0 ? (
                    <EmptyState icon={MapPin} title="No districts found" subtitle="Add your first district above" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginated.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50/50 transition">
                                        <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                                        <td className="px-4 py-3 text-gray-500">{r.code || "—"}</td>
                                        <td className="px-4 py-3"><Badge active={r.is_active !== false} /></td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex gap-1">
                                                <button
                                                    onClick={() => setPanel({ open: true, mode: "edit", item: r })}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-emerald-600 transition"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setConfirm({ open: true, item: r })}
                                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div className="p-4 border-t border-gray-100">
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
            </div>

            {/* Slide Panel */}
            <SlidePanel
                open={panel.open}
                onClose={() => setPanel({ open: false, mode: "add", item: null })}
                title={panel.mode === "edit" ? "Edit District" : "Add District"}
            >
                <form onSubmit={handleSave} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            name="name"
                            required
                            defaultValue={panel.item?.name || ""}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                        <input
                            name="code"
                            defaultValue={panel.item?.code || ""}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={panel.item?.is_active !== false}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <label className="text-sm text-gray-700">Active</label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => setPanel({ open: false, mode: "add", item: null })}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving && (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            )}
                            {panel.mode === "edit" ? "Update" : "Create"}
                        </button>
                    </div>
                </form>
            </SlidePanel>

            {/* Confirm Delete */}
            <ConfirmDialog
                open={confirm.open}
                title="Delete District"
                message={`Are you sure you want to delete "${confirm.item?.name}"? This action cannot be undone.`}
                onConfirm={handleDelete}
                onCancel={() => setConfirm({ open: false, item: null })}
                loading={saving}
            />
        </div>
    );
}
