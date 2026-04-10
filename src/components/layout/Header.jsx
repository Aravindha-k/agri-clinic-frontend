import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Bell, RefreshCw, ChevronRight, LogOut, User, Settings } from "lucide-react";

const PAGE_META = {
  "/dashboard": { name: "Dashboard", parent: null },
  "/employees": { name: "Employees", parent: null },
  "/farmers": { name: "Farmers", parent: null },
  "/visits": { name: "Visits", parent: null },
  "/visits/create": { name: "Create Visit", parent: "Visits" },
  "/tracking": { name: "Live Tracking", parent: null },
  "/masters": { name: "Master Data", parent: null },
  "/masters/locations": { name: "Locations", parent: "Masters" },
  "/masters/crops": { name: "Crops", parent: "Masters" },
  "/masters/problem-categories": { name: "Problem Categories", parent: "Masters" },
  "/reports": { name: "Reports", parent: null },
  "/notifications": { name: "Notifications", parent: null },
  "/audit": { name: "Audit Log", parent: null },
  "/crop-issues": { name: "Crop Issues", parent: null },
  "/recommendations": { name: "Recommendations", parent: null },
};

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return time;
}

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const now = useClock();
  const [refreshing, setRefreshing] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const meta = (() => {
    const p = location.pathname;
    if (PAGE_META[p]) return PAGE_META[p];
    if (/^\/farmers\/\d+/.test(p)) return { name: "Farmer Detail", parent: "Farmers" };
    if (/^\/visits\/\d+\/edit/.test(p)) return { name: "Edit Visit", parent: "Visits" };
    if (/^\/visits\/\d+/.test(p)) return { name: "Visit Detail", parent: "Visits" };
    return { name: "Dashboard", parent: null };
  })();

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.username || "Admin";

  const initials = (
    user?.first_name?.[0] || user?.username?.[0] || "A"
  ).toUpperCase();

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => window.location.reload(), 100);
  };

  const handleLogout = async () => {
    try { await logout(); } catch { }
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
  };

  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  return (
    <header
      className="sticky top-0 z-20"
      style={{
        background: "rgba(248,252,249,0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(15,118,110,0.08)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
      }}
    >
      {/* Premium green accent line at top */}
      <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, #15803d 0%, #22c55e 50%, #059669 100%)" }} />

      <div className="flex items-center justify-between h-[58px] px-4 sm:px-6 lg:px-8">

        {/* ── Left: menu + breadcrumb ── */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 min-w-0">
            {meta.parent && (
              <>
                <span className="text-sm text-gray-400 font-medium hidden sm:block truncate">
                  {meta.parent}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 hidden sm:block flex-shrink-0" />
              </>
            )}
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              {meta.name}
            </h2>
          </nav>
        </div>

        {/* ── Right: clock + actions + user ── */}
        <div className="flex items-center gap-1 sm:gap-2">

          {/* Date/time */}
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-[12px] font-bold text-gray-800 leading-none tabular-nums">{timeStr}</span>
            <span className="text-[10px] text-gray-400 mt-0.5 font-medium">{dateStr}</span>
          </div>

          <div className="hidden md:block w-px h-6 bg-gray-200 mx-1" />

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
            title="Refresh page"
          >
            <RefreshCw className={`w-[17px] h-[17px] ${refreshing ? "animate-spin" : ""}`} />
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigate("/notifications")}
            className="relative p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
            title="Notifications"
          >
            <Bell className="w-[17px] h-[17px]" />
            <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-red-500 ring-[1.5px] ring-white" />
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 pl-1 pr-2.5 py-1.5 rounded-xl hover:bg-gray-100/80 transition-all"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, #16a34a 0%, #065f46 100%)", boxShadow: "0 2px 6px rgba(21,128,61,0.35), 0 0 0 2px rgba(34,197,94,0.20)" }}
              >
                {initials}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-[12.5px] font-semibold text-gray-900 truncate leading-tight max-w-[120px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-gray-400 leading-tight capitalize">
                  {user?.role || "administrator"}
                </p>
              </div>
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl z-50 overflow-hidden"
                  style={{
                    boxShadow: "0 0 0 1px rgba(15,118,110,0.08), 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                    border: "1px solid rgba(15,118,110,0.08)",
                  }}
                >
                  <div className="px-4 py-3" style={{ background: "linear-gradient(135deg, #f0fdf8, #f8fffc)", borderBottom: "1px solid rgba(15,118,110,0.07)" }}>
                    <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{user?.email || user?.username}</p>
                  </div>
                  <div className="py-1.5">
                    <button
                      onClick={() => { setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50/60 hover:text-emerald-800 transition-colors"
                    >
                      <User className="w-4 h-4 text-gray-400" /> Profile
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate("/masters"); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50/60 hover:text-emerald-800 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-400" /> Settings
                    </button>
                  </div>
                  <div className="py-1.5" style={{ borderTop: "1px solid rgba(15,118,110,0.07)" }}>
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
