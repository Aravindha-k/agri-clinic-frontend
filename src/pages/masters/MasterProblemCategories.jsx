import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Pencil, Trash2, Bug } from "lucide-react";
import { getProblemCategories, createProblemCategory, updateProblemCategory, deleteProblemCategory } from "../../api/master.api";
import { unwrapResponse } from "../../api/axios";
import { Badge, TableSkeleton, EmptyState, Pagination } from "../../components/ui/DataTable";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";

const PER_PAGE = 15;

const getProblemCategoryId = (item) =>
    item?.id ?? item?.problem_category_id ?? item?.category_id ?? item?.pk ?? null;

export default function MasterProblemCategories() {
    const toast = useToast();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const [panel, setPanel] = useState({ open: false, mode: "add", item: null });
    const [confirm, setConfirm] = useState({ open: false, item: null });
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getProblemCategories();
            const records = unwrapResponse(res.data);
            setRows(Array.isArray(records) ? records : []);
        } catch {
            toast("Failed to load problem categories", "error");
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = rows.filter((r) =>
        (r.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.description || "").toLowerCase().includes(search.toLowerCase())
    );
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const handleSave = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
            name: fd.get("name"),
            description: fd.get("description"),
            is_active: fd.get("is_active") === "on",
        };
        try {
            setSaving(true);
            if (panel.mode === "edit") {
                const categoryId = getProblemCategoryId(panel.item);
                if (categoryId == null) {
                    throw new Error("Missing problem category identifier");
                }
                await updateProblemCategory(categoryId, payload);
                toast("Problem category updated");
            } else {
                await createProblemCategory(payload);
                toast("Problem category created");
            }
            setPanel({ open: false, mode: "add", item: null });
            fetchData();
        } catch (err) {
            toast(err?.response?.data?.detail || "Save failed", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            setSaving(true);
            const categoryId = getProblemCategoryId(confirm.item);
            if (categoryId == null) {
                throw new Error("Missing problem category identifier");
            }
            await deleteProblemCategory(categoryId);
            toast("Problem category deleted");
            setConfirm({ open: false, item: null });
            fetchData();
        } catch (err) {
            toast(err?.response?.data?.detail || err?.message || "Delete failed", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Problem Categories</h1>
                    <p className="text-sm text-gray-500 mt-1">{filtered.length} records</p>
                </div>
                <button onClick={() => setPanel({ open: true, mode: "add", item: null })} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition shadow-sm">
                    <Plus className="w-4 h-4" /> Add Category
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search categories…" className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" />
                    </div>
                </div>

                {loading ? (
                    <TableSkeleton rows={8} cols={4} />
                ) : paginated.length === 0 ? (
                    <EmptyState icon={Bug} title="No categories found" subtitle="Add your first problem category above" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginated.map((r) => (
                                    <tr key={getProblemCategoryId(r) || r.name} className="hover:bg-gray-50/50 transition">
                                        <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.description || "—"}</td>
                                        <td className="px-4 py-3"><Badge active={r.is_active !== false} /></td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex gap-1">
                                                <button onClick={() => setPanel({ open: true, mode: "edit", item: r })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-emerald-600 transition"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => setConfirm({ open: true, item: r })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
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

            <SlidePanel open={panel.open} onClose={() => setPanel({ open: false, mode: "add", item: null })} title={panel.mode === "edit" ? "Edit Category" : "Add Category"}>
                <form onSubmit={handleSave} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input name="name" required defaultValue={panel.item?.name || ""} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea name="description" rows={3} defaultValue={panel.item?.description || ""} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none" />
                    </div>
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

            <ConfirmDialog open={confirm.open} title="Delete Category" message={`Delete "${confirm.item?.name}"? This cannot be undone.`} onConfirm={handleDelete} onCancel={() => setConfirm({ open: false, item: null })} loading={saving} />
        </div>
    );
}
