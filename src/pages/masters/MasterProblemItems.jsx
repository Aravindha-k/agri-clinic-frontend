import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bug,
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { PageLoader, EmptyState } from "../../components/ui/command";
import { Badge } from "../../components/ui/DataTable";
import {
  fetchProblemCategories,
  fetchAllProblemMasters,
  createProblemMaster,
  updateProblemMaster,
  deleteProblemMaster,
  probeProblemMastersApi,
  importProblemMastersExcel,
} from "../../api/master.api";
import { fetchAllCrops } from "../../api/crop.api";
import { logApiDiagnostics } from "../../utils/apiDiagnostics";
import SlidePanel from "../../components/ui/SlidePanel";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import {
  filterManagedCategories,
  problemItemMatchesSearch,
  resolveProblemCategoryLabel,
  resolveProblemCropLabel,
  resolveProblemEnglishName,
  resolveProblemTamilName,
  normalizeProblemImportResult,
} from "../../utils/problemMasterDisplay";

const inputClass =
  "w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

function ImportSummary({ result, onDismiss }) {
  if (!result) return null;
  const hasErrors = result.failed > 0 || (result.errors?.length ?? 0) > 0;
  const ok = !hasErrors && (result.created > 0 || result.updated > 0);

  return (
    <div
      className={`rounded-xl border px-4 py-3 mb-4 ${
        ok
          ? "border-emerald-200 bg-emerald-50/80"
          : hasErrors
            ? "border-amber-200 bg-amber-50/80"
            : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {result.message ||
                (ok ? "Import completed successfully" : "Import finished with issues")}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-600">
              {result.created > 0 && (
                <span>
                  <strong className="text-emerald-700">{result.created}</strong> created
                </span>
              )}
              {result.updated > 0 && (
                <span>
                  <strong className="text-emerald-700">{result.updated}</strong> updated
                </span>
              )}
              {result.skipped > 0 && (
                <span>
                  <strong className="text-gray-700">{result.skipped}</strong> skipped
                </span>
              )}
              {result.failed > 0 && (
                <span>
                  <strong className="text-red-600">{result.failed}</strong> failed
                </span>
              )}
              {result.total != null && (
                <span>
                  <strong>{result.total}</strong> rows processed
                </span>
              )}
            </div>
            {result.errors?.length > 0 && (
              <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto text-xs text-red-700">
                {result.errors.slice(0, 12).map((err, i) => (
                  <li key={i}>
                    {typeof err === "string"
                      ? err
                      : `Row ${err.row ?? err.line ?? "?"}: ${err.message ?? err.error ?? JSON.stringify(err)}`}
                  </li>
                ))}
                {result.errors.length > 12 && (
                  <li className="text-gray-500">…and {result.errors.length - 12} more</li>
                )}
              </ul>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function MasterProblemItems() {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [apiAvailable, setApiAvailable] = useState(null);
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [managedCategories, setManagedCategories] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [panel, setPanel] = useState({ open: false, mode: "add", item: null });
  const [confirm, setConfirm] = useState({ open: false, item: null });
  const [saving, setSaving] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const available = await probeProblemMastersApi();
      setApiAvailable(available);

      const [cats, cropMerged] = await Promise.all([
        fetchProblemCategories(),
        fetchAllCrops(),
      ]);
      setCategories(cats);
      setManagedCategories(filterManagedCategories(cats));
      setCrops(cropMerged.results || []);

      if (available) {
        const params = {};
        if (filterCategory) params.category_id = filterCategory;
        const { items, count } = await fetchAllProblemMasters(params);
        setRows(items || []);
        setTotalCount(typeof count === "number" ? count : (items?.length ?? 0));
      } else {
        setRows([]);
        setTotalCount(0);
      }
    } catch {
      toast("Failed to load problem items", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => rows.filter((r) => problemItemMatchesSearch(r, search)),
    [rows, search]
  );

  useEffect(() => {
    logApiDiagnostics({
      label: "problem-masters-ui",
      url: "/api/v1/masters/problem-masters/",
      apiCount: totalCount,
      rowsLoaded: rows.length,
      rowsRendered: filtered.length,
      pagination: { filterCategory: filterCategory || null, search: search.trim() || null },
    });
  }, [totalCount, rows.length, filtered.length, filterCategory, search]);

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const nameEn = String(fd.get("name_en") ?? "").trim();
    const nameTa = String(fd.get("name_ta") ?? "").trim();

    const payload = {
      name: nameEn,
      name_en: nameEn,
      name_ta: nameTa || undefined,
      category: Number(fd.get("category")),
      is_active: fd.get("is_active") === "on",
    };
    const cropVal = fd.get("crop");
    if (cropVal) payload.crop = Number(cropVal);

    try {
      setSaving(true);
      if (panel.mode === "edit") {
        await updateProblemMaster(panel.item.id, payload);
        toast("Problem item updated");
      } else {
        await createProblemMaster(payload);
        toast("Problem item created");
      }
      setPanel({ open: false, mode: "add", item: null });
      load();
    } catch (err) {
      toast(err?.response?.data?.detail || err?.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      await deleteProblemMaster(confirm.item.id);
      toast("Problem item deleted");
      setConfirm({ open: false, item: null });
      load();
    } catch (err) {
      toast(err?.response?.data?.detail || "Delete failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleImportClick = () => {
    setImportResult(null);
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toast("Please choose an Excel (.xlsx, .xls) or CSV file", "error");
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      const response = await importProblemMastersExcel(file, {
        category_id: filterCategory || undefined,
        onUploadProgress: (evt) => {
          if (evt.total) {
            setImportProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });
      const result = normalizeProblemImportResult(response);
      setImportResult(result);
      if (result.created > 0 || result.updated > 0) {
        toast(
          `Import complete: ${result.created} created, ${result.updated} updated`,
          result.failed > 0 ? "warning" : "success"
        );
        await load();
      } else if (result.failed > 0) {
        toast(`Import failed for ${result.failed} row(s)`, "error");
      } else {
        toast(result.message || "Import completed — no rows changed", "warning");
      }
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        "Import failed";
      if (status === 404) {
        setImportResult({
          success: false,
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 1,
          errors: [
            "Import API is not available yet (masters/problem-masters/import/). Deploy the backend import endpoint or add items manually.",
          ],
          message: "Import endpoint not found",
        });
      } else {
        setImportResult({
          success: false,
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 1,
          errors: [typeof msg === "string" ? msg : "Import failed"],
          message: "Import failed",
        });
      }
      toast(typeof msg === "string" ? msg : "Import failed", "error");
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  if (apiAvailable === false) {
    return (
      <div className="ops-page max-w-3xl">
        <h1 className="text-xl font-semibold text-gray-900">Problem Items</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Manage Pest, Disease, and Nutrient Issue dropdown options for Add Visit.
        </p>
        <EmptyState
          icon={Bug}
          title="Problem items API not available"
          subtitle="The backend endpoint masters/problem-masters/ is not deployed yet. Problem categories can still be managed under Problem Categories."
        />
      </div>
    );
  }

  return (
    <div className="ops-page">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Problem Items</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Pest, Disease, and Nutrient Issue options for the Add Visit form
            {!loading && (
              <span className="ml-2 font-semibold text-emerald-700">{totalCount} total</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleImportClick}
            disabled={importing || loading}
            className="btn btn-secondary btn-md"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {importProgress != null ? `Uploading ${importProgress}%` : "Importing…"}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Import Excel
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setPanel({ open: true, mode: "add", item: null })}
            className="btn btn-primary btn-md"
          >
            <Plus className="w-4 h-4" /> Add item
          </button>
        </div>
      </div>

      {importing && (
        <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">Importing problem items…</p>
            <div className="mt-2 h-1.5 rounded-full bg-emerald-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${importProgress ?? 30}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <ImportSummary result={importResult} onDismiss={() => setImportResult(null)} />

      <div className="section-card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search English, Tamil, crop, category…"
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={inputClass + " max-w-xs"}
          >
            <option value="">All categories</option>
            {managedCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <PageLoader label="Loading problem items…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Bug}
            title="No problem items"
            subtitle={
              search || filterCategory
                ? "No items match your filters"
                : "Add pests, diseases, or nutrient issues — or import from Excel"
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Category</th>
                  <th>English Name</th>
                  <th>Tamil Name</th>
                  <th>Status</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="text-sm text-gray-600">{resolveProblemCropLabel(row)}</td>
                    <td className="text-sm text-gray-700">{resolveProblemCategoryLabel(row)}</td>
                    <td className="font-medium text-gray-900">
                      {resolveProblemEnglishName(row) || "—"}
                    </td>
                    <td className="text-sm text-gray-600">
                      {resolveProblemTamilName(row) || "—"}
                    </td>
                    <td>
                      <Badge active={row.is_active !== false} />
                    </td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        <button
                          type="button"
                          className="p-2 rounded-lg hover:bg-gray-100"
                          onClick={() => setPanel({ open: true, mode: "edit", item: row })}
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg hover:bg-red-50"
                          onClick={() => setConfirm({ open: true, item: row })}
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SlidePanel
        open={panel.open}
        onClose={() => setPanel({ open: false, mode: "add", item: null })}
        title={panel.mode === "edit" ? "Edit problem item" : "Add problem item"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              English Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name_en"
              required
              defaultValue={resolveProblemEnglishName(panel.item)}
              placeholder="e.g. Stem borer"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tamil Name</label>
            <input
              name="name_ta"
              defaultValue={resolveProblemTamilName(panel.item)}
              placeholder="e.g. தண்டு துளைப்பான்"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              required
              defaultValue={panel.item?.category ?? panel.item?.category_id ?? ""}
              className={inputClass}
            >
              <option value="">Select category</option>
              {managedCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Crop (optional)</label>
            <select
              name="crop"
              defaultValue={panel.item?.crop ?? panel.item?.crop_id ?? ""}
              className={inputClass}
            >
              <option value="">Any crop</option>
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_en || c.name}
                  {c.name_ta ? ` (${c.name_ta})` : ""}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={panel.item?.is_active !== false}
            />
            Active
          </label>
          <button type="submit" disabled={saving} className="btn btn-primary btn-md w-full">
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </SlidePanel>

      <ConfirmDialog
        open={confirm.open}
        title="Delete problem item"
        message={`Delete "${resolveProblemEnglishName(confirm.item)}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, item: null })}
        loading={saving}
      />
    </div>
  );
}
