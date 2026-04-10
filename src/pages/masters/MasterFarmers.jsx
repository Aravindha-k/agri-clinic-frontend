import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Pencil, Sprout, Phone } from "lucide-react";
import { getDistricts, getVillages, getFarmers, createFarmer, updateFarmer, patchFarmer } from "../../api/master.api";
import { unwrapResponse } from "../../api/axios";
import { Badge, TableSkeleton, EmptyState, Pagination } from "../../components/ui/DataTable";
import SlidePanel from "../../components/ui/SlidePanel";
import { useToast } from "../../components/ui/Toast";

const PER_PAGE = 15;

export default function MasterFarmers() {
    const toast = useToast();
    const [rows, setRows] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [villages, setVillages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [fDist, setFDist] = useState("");
    const [fVil, setFVil] = useState("");
    const [page, setPage] = useState(1);
    const [panel, setPanel] = useState({ open: false, mode: "add", item: null });
    const [saving, setSaving] = useState(false);
    const [formDist, setFormDist] = useState("");

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [fR, dR, vR] = await Promise.all([getFarmers(), getDistricts(), getVillages()]);
            const farmers = unwrapResponse(fR.data);
            const dists = unwrapResponse(dR.data);
            const vils = unwrapResponse(vR.data);
            setRows(Array.isArray(farmers) ? farmers : []);
            setDistricts(Array.isArray(dists) ? dists : []);
            setVillages(Array.isArray(vils) ? vils : []);
        } catch { toast("Failed to load farmers", "error"); }
        finally { setLoading(false); }
    }, [toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const dMap = Object.fromEntries(districts.map((d) => [d.id, d.name]));
    const vMap = Object.fromEntries(villages.map((v) => [v.id, v]));
    const vilName = (r) => vMap[r.village || r.village_id]?.name || "—";
    const distName = (r) => {
        const v = vMap[r.village || r.village_id];
        if (!v) return "—";
        return dMap[v.district || v.district_id] || "—";
    };

    const fVillages = fDist
        ? villages.filter((v) => {
            return String(v.district || v.district_id) === String(fDist);
        })
        : villages;
    const panelVillages = formDist
        ? villages.filter((v) => {
            return String(v.district || v.district_id) === String(formDist);
        })
        : villages;

    const q = search.toLowerCase();
    const filtered = rows.filter((r) => {
        if (q && !(r.name || "").toLowerCase().includes(q) && !(r.phone || "").includes(q)) return false;
        if (fVil && String(r.village || r.village_id) !== fVil) return false;
        if (fDist) { const v = vMap[r.village || r.village_id]; if (!v || String(v.district || v.district_id) !== String(fDist)) return false; }
        return true;
    });
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const openPanel = (mode, item) => {
        if (mode === "edit" && item) {
            const v = vMap[item.village || item.village_id];
            setFormDist(v ? String(v.district || v.district_id) : "");
        } else { setFormDist(""); }
        setPanel({ open: true, mode, item });
    };

    const toggleActive = async (r) => {
        try { await patchFarmer(r.id, { is_active: !r.is_active }); toast(r.is_active ? "Farmer disabled" : "Farmer enabled"); fetchData(); }
        catch { toast("Toggle failed", "error"); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = { name: fd.get("name"), phone: fd.get("phone"), village: fd.get("village") || undefined, land_area: fd.get("land_area") || undefined, is_active: fd.get("is_active") === "on" };
        try {
            setSaving(true);
            if (panel.mode === "edit") { await updateFarmer(panel.item.id, payload); toast("Farmer updated"); }
            else { await createFarmer(payload); toast("Farmer created"); }
            setPanel({ open: false, mode: "add", item: null }); fetchData();
        } catch (err) { toast(err?.response?.data?.detail || "Save failed", "error"); }
        finally { setSaving(false); }
    };

    const cls = "px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none";

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Farmer Management</h1>
                    <p className="text-sm text-gray-500 mt-1">{filtered.length} farmers</p>
                </div>
                <button onClick={() => openPanel("add", null)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition shadow-sm">
                    <Plus className="w-4 h-4" /> Add Farmer
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name or phone…" className={`w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition`} />
                    </div>
                    <select value={fDist} onChange={(e) => { setFDist(e.target.value); setFVil(""); setPage(1); }} className={`${cls} min-w-[140px]`}>
                        <option value="">All Districts</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <select value={fVil} onChange={(e) => { setFVil(e.target.value); setPage(1); }} className={`${cls} min-w-[140px]`}>
                        <option value="">All Villages</option>{fVillages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>

                {loading ? <TableSkeleton rows={8} cols={7} /> : paginated.length === 0 ? (
                    <EmptyState icon={Sprout} title="No farmers found" subtitle="Add your first farmer above" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50/80 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Village</th>
                                <th className="px-4 py-3">District</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginated.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50/50 transition">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">{(r.name || "?")[0].toUpperCase()}</div>
                                                <span className="font-medium text-gray-900">{r.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500"><span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{r.phone || "—"}</span></td>
                                        <td className="px-4 py-3 text-gray-500">{vilName(r)}</td>
                                        <td className="px-4 py-3 text-gray-500">{talName(r)}</td>
                                        <td className="px-4 py-3 text-gray-500">{distName(r)}</td>
                                        <td className="px-4 py-3"><Badge active={r.is_active !== false} /></td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <button onClick={() => openPanel("edit", r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-emerald-600 transition"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => toggleActive(r)} className={`relative w-9 h-5 rounded-full transition-colors ${r.is_active !== false ? "bg-emerald-500" : "bg-gray-300"}`} title={r.is_active !== false ? "Disable" : "Enable"}>
                                                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${r.is_active !== false ? "translate-x-4" : ""}`} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                    </div>
                )}
                <div className="p-4 border-t border-gray-100"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>
            </div>

            <SlidePanel open={panel.open} onClose={() => setPanel({ open: false, mode: "add", item: null })} title={panel.mode === "edit" ? "Edit Farmer" : "Add Farmer"} wide>
                <form onSubmit={handleSave} className="space-y-5" key={panel.item?.id || "new"}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input name="name" required defaultValue={panel.item?.name || ""} className={`w-full ${cls}`} /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input name="phone" defaultValue={panel.item?.phone || ""} className={`w-full ${cls}`} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                            <select value={formDist} onChange={(e) => { setFormDist(e.target.value); }} className={`w-full ${cls}`}><option value="">Select</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
                            <select name="village" defaultValue={panel.item?.village || panel.item?.village_id || ""} className={`w-full ${cls}`}><option value="">Select</option>{panelVillages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Land Area (acres)</label><input name="land_area" type="number" step="0.01" defaultValue={panel.item?.land_area || ""} className={`w-full ${cls}`} /></div>
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
