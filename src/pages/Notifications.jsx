import { PageLoader } from "../components/ui/command";
import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCircle2, RefreshCw, AlertCircle, Info, AlertTriangle, CheckCircle } from "lucide-react";
import api from "../api/axios";

function notifIcon(n) {
    const t = (n.notification_type || n.type || "").toLowerCase();
    if (t.includes("alert") || t.includes("warn"))
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    if (t.includes("success") || t.includes("resolv"))
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (t.includes("error") || t.includes("fail"))
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <Info className="w-4 h-4 text-sky-500" />;
}

function fmtNotifTime(d) {
    if (!d) return "";
    const ms = Date.now() - new Date(d).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.get("notifications/list/");
            const data = res.data;
            setNotifications(Array.isArray(data) ? data : data?.results || []);
        } catch (err) {
            setError(err?.response?.data?.detail || "Failed to load notifications");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    const markAsRead = async (id) => {
        try {
            await api.patch(`notifications/${id}/read/`);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
        } catch { /* silent */ }
    };

    const markAllRead = async () => {
        const unread = notifications.filter((n) => !n.is_read);
        await Promise.allSettled(unread.map((n) => api.patch(`notifications/${n.id}/read/`)));
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    if (loading) {
        return (
            <div className="page-container">
                <PageLoader label="Loading notifications…" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="alert-error">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                    <button onClick={fetchNotifications} className="ml-auto font-semibold hover:underline">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* ── Header ── */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Notifications</h1>
                    <p className="page-subtitle">
                        {unreadCount > 0
                            ? <span className="text-emerald-600 font-semibold">{unreadCount} unread</span>
                            : "All caught up"
                        }
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button onClick={markAllRead} className="btn btn-secondary btn-md">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Mark all read
                        </button>
                    )}
                    <button onClick={fetchNotifications} className="btn btn-ghost btn-md" title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── Unread count badge ── */}
            {unreadCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-sm text-emerald-700 font-medium">
                        You have {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                    </p>
                </div>
            )}

            {/* ── List ── */}
            {notifications.length === 0 ? (
                <div className="section-card">
                    <div className="empty-state">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-4">
                            <Bell className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-gray-600 font-semibold">No notifications yet</p>
                        <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            className={`group feed-card ${n.is_read ? "" : "feed-card-unread"}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`list-meta-icon flex-shrink-0 ${n.is_read ? "list-meta-icon--neutral" : "list-meta-icon--crop"}`}>
                                    {notifIcon(n)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-xs leading-snug ${n.is_read ? "text-gray-600" : "text-gray-900 font-semibold"
                                            }`}>
                                            {n.title || n.message}
                                        </p>
                                        <span className="text-[11px] text-gray-400 flex-shrink-0 mt-0.5">
                                            {fmtNotifTime(n.created_at)}
                                        </span>
                                    </div>
                                    {n.title && n.message && (
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                                    )}
                                </div>

                                {/* Unread dot + action */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {!n.is_read && (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <button
                                                onClick={() => markAsRead(n.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-all"
                                                title="Mark as read"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
