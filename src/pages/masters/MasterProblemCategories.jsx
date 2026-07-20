import { PageLoader } from "../../components/ui/command";
import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Pencil, Trash2, Bug, Tag, X } from "lucide-react";
import { getProblemCategories, createProblemCategory, updateProblemCategory, deleteProblemCategory } from "../../api/master.api";
import { unwrapResponse } from "../../api/axios";
import { EmptyState, Pagination } from "../../components/ui/DataTable";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";

const PER_PAGE = 15;

const getProblemCategoryId = (item) =>
    item?.id ?? item?.problem_category_id ?? item?.category_id ?? item?.pk ?? null;

function MastersStatus({ active }) {
    return (
        <span className={`masters-admin-status ${active !== false ? "masters-admin-status--active" : "masters-admin-status--inactive"}`}>
            <span className="masters-admin-status__dot" aria-hidden="true" />
            {active !== false ? "Active" : "Disabled"}
        </span>
    );
}

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
        <div className="masters-admin page-container">
            <header className="masters-admin-header">
                <div className="masters-admin-header__inner">
                    <div className="masters-admin-header__brand">
                        <div className="masters-admin-header__icon" aria-hidden="true">
                            <Tag className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="masters-admin-header__badge">
                                <Tag className="w-3 h-3" aria-hidden="true" />
                                Problem taxonomy
                            </span>
                            <h1 className="masters-admin-header__title">Problem Categories</h1>
                            <p className="masters-admin-header__subtitle">{filtered.length} records</p>
                        </div>
                    </div>
                    <div className="masters-admin-header__actions">
                        <button type="button" onClick={() => setPanel({ open: true, mode: "add", item: null })} className="btn btn-primary btn-md">
                            <Plus className="w-4 h-4" aria-hidden="true" /> Add category
                        </button>
                    </div>
                </div>
            </header>

            <section className="masters-admin-filters" aria-label="Search categories">
                <div className="masters-admin-filters__row">
                    <div className="masters-admin-search max-w-md">
                        <Search className="search-icon" aria-hidden="true" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search categories…"
                            className="search-input"
                            aria-label="Search categories"
                        />
                    </div>
                    {search && (
                        <button type="button" onClick={() => setSearch("")} className="btn btn-ghost btn-sm">
                            <X className="w-3.5 h-3.5" aria-hidden="true" /> Clear
                        </button>
                    )}
                </div>
            </section>

            <div className="masters-admin-table-card">
                {loading ? (
                    <PageLoader label="Loading categories…" />
                ) : paginated.length === 0 ? (
                    <div className="masters-admin-empty">
                        <EmptyState icon={Bug} title="No categories found" subtitle="Add your first problem category above" />
                    </div>
                ) : (
                    <div className="masters-admin-table-wrap">
                        <table className="data-table compact-table masters-admin-table w-full">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Description</th>
                                    <th>Status</th>
                                    <th className="text-right w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((r) => (
                                    <tr key={getProblemCategoryId(r) || r.name}>
                                        <td className="font-semibold text-slate-900">{r.name}</td>
                                        <td className="text-slate-500 max-w-xs truncate">{r.description || "—"}</td>
                                        <td><MastersStatus active={r.is_active} /></td>
                                        <td>
                                            <div className="masters-admin-actions">
                                                <button type="button" onClick={() => setPanel({ open: true, mode: "edit", item: r })} className="masters-admin-action-btn masters-admin-action-btn--edit" aria-label="Edit">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button type="button" onClick={() => setConfirm({ open: true, item: r })} className="masters-admin-action-btn masters-admin-action-btn--delete" aria-label="Delete">
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

                <div className="masters-admin-pagination border-t-0">
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
            </div>

            <SlidePanel
                tone="masters"
                open={panel.open}
                onClose={() => setPanel({ open: false, mode: "add", item: null })}
                title={panel.mode === "edit" ? "Edit Category" : "Add Category"}
            >
                <form onSubmit={handleSave} className="masters-admin-form">
                    <div className="masters-admin-field">
                        <label>Name</label>
                        <input name="name" required defaultValue={panel.item?.name || ""} />
                    </div>
                    <div className="masters-admin-field">
                        <label>Description</label>
                        <textarea name="description" rows={3} defaultValue={panel.item?.description || ""} />
                    </div>
                    <label className="masters-admin-check">
                        <input type="checkbox" name="is_active" defaultChecked={panel.item?.is_active !== false} />
                        Active
                    </label>
                    <div className="masters-admin-form__foot">
                        <button type="button" onClick={() => setPanel({ open: false, mode: "add", item: null })} className="btn btn-secondary btn-md">Cancel</button>
                        <button type="submit" disabled={saving} className="btn btn-primary btn-md">
                            {panel.mode === "edit" ? "Update" : "Create"}
                        </button>
                    </div>
                </form>
            </SlidePanel>

            <ConfirmDialog
                open={confirm.open}
                title="Delete Category"
                message={`Delete "${confirm.item?.name}"? This cannot be undone.`}
                onConfirm={handleDelete}
                onCancel={() => setConfirm({ open: false, item: null })}
                loading={saving}
            />
        </div>
    );
}
