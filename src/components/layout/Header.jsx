import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Bell, RefreshCw, LogOut, ChevronDown } from "lucide-react";
import useCloseOnRouteChange from "../../hooks/useCloseOnRouteChange";
import { logOverlayState } from "../../utils/overlayDebug";
import { usePageChrome } from "../../context/PageChromeContext";
import { useSoftRefresh } from "../../context/SoftRefreshContext";
import { resolvePageShellMeta } from "./pageShellMeta";

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return time;
}

/**
 * Compact shared admin shell header — title + utilities (no global search).
 */
export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pageChrome = usePageChrome();
  const softRefresh = useSoftRefresh();
  const chrome = pageChrome?.chrome;
  const routeMeta = resolvePageShellMeta(location.pathname);
  const now = useClock();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const refreshing = Boolean(softRefresh?.refreshing);

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
    if (refreshing) return;
    softRefresh?.softRefresh?.();
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

  const title = chrome?.title || routeMeta?.title || null;
  const subtitle = chrome?.subtitle ?? routeMeta?.subtitle ?? null;
  const badge = chrome?.badge ?? null;
  const actions = chrome?.actions ?? null;
  const hasChrome = Boolean(title);

  return (
    <header
      className={`app-header app-header--unified sticky top-0 z-20${
        hasChrome ? " app-header--has-chrome" : ""
      }`}
    >
      <div className="app-header__edge" aria-hidden="true" />

      <div className="app-header__body">
        <div className="app-header__main">
          <div className="app-header__lead min-w-0">
            <button
              type="button"
              onClick={onMenuClick}
              className="app-header__menu-btn lg:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {hasChrome && (
              <div className={`app-header__chrome min-w-0 ${chrome?.className || ""}`}>
                <div className="app-header__title-row">
                  <h1 className="app-header__title">{title}</h1>
                  {badge}
                </div>
                {subtitle && (
                  <p className="app-header__subtitle">{subtitle}</p>
                )}
                <div className="app-header__title-accent" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="app-header__tools">
            <div className="app-header__cluster">
              <div className="app-header__clock hidden md:flex" aria-label="Current time">
                <span className="app-header__clock-time">{timeStr}</span>
                <span className="app-header__clock-date">{dateStr}</span>
              </div>

              <div className="app-header__divider hidden md:block" aria-hidden="true" />

              {actions && (
                <div className="app-header__page-actions">
                  {actions}
                </div>
              )}

              <div className="app-header__controls">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="app-header__icon-btn"
                  aria-label="Refresh data"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-[17px] h-[17px] ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/notifications")}
                  className="app-header__icon-btn header-notify-btn"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
                </button>

                <div className="app-header__divider hidden sm:block" aria-hidden="true" />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="header-profile-btn"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                  >
                    <div className="header-profile-avatar" aria-hidden="true">{initials}</div>
                    <div className="hidden md:block text-left min-w-0">
                      <p className="text-[13px] font-semibold text-slate-900 truncate leading-tight max-w-[120px]">
                        {displayName}
                      </p>
                      <p className="text-[10px] text-slate-500 leading-tight capitalize">
                        {user?.is_superuser
                          ? "Owner"
                          : user?.is_staff
                            ? "Administrator"
                            : user?.role || "Administrator"}
                      </p>
                    </div>
                    <ChevronDown className="hidden md:block w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={closeUserMenu}
                        aria-hidden="true"
                        data-overlay="profile-menu-backdrop"
                      />
                      <div className="enterprise-dropdown" role="menu">
                        <div className="enterprise-dropdown__head">
                          <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{user?.email || user?.username}</p>
                        </div>
                        <div className="py-1.5 border-t border-slate-100">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                            className="enterprise-dropdown__item enterprise-dropdown__item--danger"
                          >
                            <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
