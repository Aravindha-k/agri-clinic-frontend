import { useState, useEffect, useCallback } from "react";
import { Settings, Save, RefreshCw } from "lucide-react";
import { getSystemSettings, updateSystemSettings } from "../../api/master.api";
import { unwrapResponse } from "../../api/axios";
import { useToast } from "../../components/ui/Toast";

const FIELDS = [
    { key: "heartbeat_timeout", label: "Heartbeat Timeout", unit: "minutes", step: 1 },
    { key: "gps_accuracy_limit", label: "GPS Accuracy Limit", unit: "meters", step: 1 },
    { key: "gps_jump_limit", label: "GPS Jump Limit", unit: "KM", step: 0.1 },
    { key: "tracking_stale_minutes", label: "Tracking Stale Minutes", unit: "minutes", step: 1 },
];

const cls = "w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none";

export default function SystemSettings() {
    const toast = useToast();
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getSystemSettings();
            setForm(unwrapResponse(res.data) || {});
        } catch {
            setError("Failed to load settings");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleChange = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await updateSystemSettings(form);
            toast("Settings saved successfully");
        } catch (err) {
            toast(err?.response?.data?.detail || "Save failed", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse space-y-6">
                    {FIELDS.map((f) => (
                        <div key={f.key} className="space-y-2">
                            <div className="h-4 w-40 bg-gray-200 rounded" />
                            <div className="h-10 bg-gray-100 rounded-xl" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                    <Settings className="w-7 h-7 text-red-400" />
                </div>
                <p className="text-gray-700 font-semibold text-lg">{error}</p>
                <button onClick={fetchData} className="mt-4 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Configure tracking and GPS parameters</p>
                </div>
                <button onClick={fetchData} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition" title="Refresh">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {FIELDS.map((f) => (
                        <div key={f.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step={f.step}
                                    value={form[f.key] ?? ""}
                                    onChange={(e) => handleChange(f.key, e.target.value)}
                                    className={cls}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{f.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                    >
                        {saving ? (
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Settings
                    </button>
                </div>
            </form>
        </div>
    );
}
