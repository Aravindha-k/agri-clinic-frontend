import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Bell, RefreshCw, ChevronRight, LogOut, User, Settings } from "lucide-react";
import GlobalSearch from "./GlobalSearch";
import Logo from "../Logo";
import useCloseOnRouteChange from "../../hooks/useCloseOnRouteChange";
import { logOverlayState } from "../../utils/overlayDebug";

const PAGE_META = {
  "/dashboard": { name: "Dashboard", parent: null },
  "/employees": { name: "Employees", parent: null },
  "/farmers": { name: "Farmers", parent: null },
  "/farmers/new": { name: "Add Farmer", parent: "Farmers" },
  "/visits": { name: "Visits", parent: null },
  "/visits/create": { name: "Create Visit", parent: "Visits" },
  "/tracking": { name: "Live Tracking", parent: null },
  "/tracking/routes": { name: "Route History", parent: "Live Tracking" },
  "/masters": { name: "Master Data", parent: null },
  "/masters/locations": { name: "Locations", parent: "Masters" },
  "/masters/crops": { name: "Crops", parent: "Masters" },
  "/masters/problem-categories": { name: "Problem Categories", parent: "Masters" },
  "/masters/problem-items": { name: "Problem Items", parent: "Masters" },
  "/reports": { name: "Reports", parent: null },
  "/notifications": { name: "Notifications", parent: null },
  "/audit": { name: "Audit Log", parent: null },
  "/settings/security": { name: "Security & Sessions", parent: null },
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

  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);
  useCloseOnRouteChange(closeUserMenu, userMenuOpen);

  useEffect(() => {
    if (!import.meta.env.DEV || !userMenuOpen) return;
    logOverlayState({ modalOpen: userMenuOpen, drawerOpen: false, backdropRendered: true });
  }, [userMenuOpen]);

  useEffect(() => {
    if (!userMenuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeUserMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [userMenuOpen, closeUserMenu]);

  const meta = (() => {
    const p = location.pathname;
    if (PAGE_META[p]) return PAGE_META[p];
    if (/^\/farmers\/[^/]+\/edit/.test(p)) return { name: "Edit Farmer", parent: "Farmers" };
    if (/^\/farmers\/[^/]+/.test(p)) return { name: "Farmer Detail", parent: "Farmers" };
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
    <header className="app-header sticky top-0 z-20">
      <div className="app-header__accent" />

      <div className="flex items-center justify-between h-[60px] px-3 sm:px-4 lg:px-6 gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-all flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden md:flex items-center flex-shrink-0 header-brand-mark">
            <Logo size="header" variant="header" showShadow={false} />
          </div>

          <nav className="hidden sm:flex items-center gap-1.5 min-w-0 max-w-[140px] lg:max-w-none">
            {meta.parent && (
              <>
                <span className="text-sm text-slate-400 font-medium truncate">
                  {meta.parent}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              </>
            )}
            <h2 className="text-sm font-semibold text-slate-900 truncate tracking-tight">
              {meta.name}
            </h2>
          </nav>
        </div>

        <div className="hidden lg:flex flex-1 justify-center max-w-md px-2">
          <GlobalSearch />
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">

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
            className="header-notify-btn"
            title="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
            <span className="header-notify-btn__dot" />
          </button>

          <div className="hidden sm:block w-px h-7 bg-slate-200 mx-0.5" />

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="header-profile-btn"
            >
              <div className="header-profile-avatar">{initials}</div>
              <div className="hidden md:block text-left min-w-0">
                <p className="text-[13px] font-semibold text-slate-900 truncate leading-tight max-w-[120px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight capitalize">
                  {user?.role || "Administrator"}
                </p>
              </div>
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={closeUserMenu}
                  aria-hidden="true"
                  data-overlay="profile-menu-backdrop"
                />
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
