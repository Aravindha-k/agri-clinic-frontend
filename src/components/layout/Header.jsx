import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, RefreshCw, LogOut, User, Settings } from "lucide-react";
import GlobalSearch from "./GlobalSearch";
import useCloseOnRouteChange from "../../hooks/useCloseOnRouteChange";
import { logOverlayState } from "../../utils/overlayDebug";

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return time;
}

/**
 * Global shell utility bar — no page title (titles live in page content only).
 */
export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
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

      <div className="relative flex items-center justify-between min-h-[60px] h-[60px] px-3 sm:px-4 lg:px-6 gap-3">
        {/* Left: mobile menu + balance spacer (no page title) */}
        <div className="flex items-center flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-all flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Center: search */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-2 pointer-events-none">
          <div className="w-full pointer-events-auto">
            <GlobalSearch />
          </div>
        </div>

        {/* Right: utilities */}
        <div className="flex items-center justify-end gap-1 sm:gap-1.5 flex-1 flex-shrink-0">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-[12px] font-bold text-gray-800 leading-none tabular-nums">{timeStr}</span>
            <span className="text-[10px] text-gray-400 mt-0.5 font-medium">{dateStr}</span>
          </div>

          <div className="hidden md:block w-px h-6 bg-gray-200 mx-1" />

          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/80 transition-all"
            aria-label="Refresh page"
            title="Refresh page"
          >
            <RefreshCw className={`w-[17px] h-[17px] ${refreshing ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => navigate("/notifications")}
            className="header-notify-btn"
            aria-label="Notifications"
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

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={closeUserMenu}
                  aria-hidden="true"
                  data-overlay="profile-menu-backdrop"
                />
                <div className="enterprise-dropdown">
                  <div className="enterprise-dropdown__head">
                    <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{user?.email || user?.username}</p>
                  </div>
                  <div className="py-1.5">
                    <button
                      type="button"
                      onClick={() => { setUserMenuOpen(false); }}
                      className="enterprise-dropdown__item"
                    >
                      <User className="w-4 h-4 text-slate-400" /> Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => { setUserMenuOpen(false); navigate("/masters"); }}
                      className="enterprise-dropdown__item"
                    >
                      <Settings className="w-4 h-4 text-slate-400" /> Settings
                    </button>
                  </div>
                  <div className="py-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className="enterprise-dropdown__item enterprise-dropdown__item--danger"
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
