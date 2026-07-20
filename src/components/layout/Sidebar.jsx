import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import SidebarNavItem from "./SidebarNavItem";
import Logo from "../Logo";
import { NAV_SECTIONS } from "./navConfig";

function resolveNavSections() {
  if (!Array.isArray(NAV_SECTIONS) || NAV_SECTIONS.length === 0) {
    return [
      {
        label: "Core",
        items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" }],
      },
    ];
  }
  return NAV_SECTIONS;
}

function SidebarUserCard({ user, loading }) {
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.username || (loading ? "Loading…" : "Admin");

  const role = loading
    ? "Signing in…"
    : user?.is_staff
      ? "Administrator"
      : user
        ? "Field Agent"
        : "Administrator";

  const initials = (
    user?.first_name?.[0] || user?.username?.[0] || "A"
  ).toUpperCase();

  return (
    <div className="sidebar-user-card">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs text-white"
        style={{
          background: "linear-gradient(135deg, #16a34a 0%, #065f46 100%)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        }}
      >
        {loading ? (
          <span className="w-3 h-3 rounded-full bg-white/30 animate-pulse" />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-[12.5px] font-semibold truncate leading-tight ${
            loading ? "text-white/50 animate-pulse" : "text-white/90"
          }`}
        >
          {displayName}
        </p>
        <p className="text-[10px] text-emerald-400/60 truncate">{role}</p>
      </div>
    </div>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { logout, user, loading: authLoading } = useAuth();
  const sections = resolveNavSections();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
    }
    navigate("/login");
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:sticky lg:top-0 left-0 top-0 z-40 flex flex-col flex-shrink-0
          h-screen w-[260px] min-w-[260px] max-w-[260px]
          transition-transform duration-300 ease-in-out select-none
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
        style={{
          background: "var(--grad-sidebar)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "4px 0 28px rgba(15,23,42,0.22)",
        }}
        aria-label="Main navigation"
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div
          className="absolute top-0 left-0 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, rgba(34,197,94,0.08) 0%, transparent 65%)",
          }}
        />

        <button
          type="button"
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 z-10 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 px-3 pt-2 pb-2 flex-shrink-0">
          <div className="sidebar-brand">
            <div className="sidebar-brand__logo">
              <Logo size="sm" variant="sidebar" showShadow={false} />
            </div>
            <div className="min-w-0">
              <p className="sidebar-brand__title">Kavya Agri Clinic</p>
              <span className="sidebar-brand__tag">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Admin Panel
              </span>
            </div>
          </div>
        </div>

        <div
          className="mx-4 h-px flex-shrink-0"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          }}
        />

        <nav
          className="relative z-10 flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden space-y-4
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {sections.map((section) => (
            <div key={section.label}>
              <p className="sidebar-nav-label">{section.label}</p>
              <div className="space-y-0.5">
                {(section.items ?? []).map((item) => (
                  <SidebarNavItem
                    key={item.path || item.label}
                    item={item}
                    onClose={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative z-10 flex-shrink-0 p-3 space-y-2">
          <div
            className="h-px mx-1"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)",
            }}
          />

          <SidebarUserCard user={user} loading={authLoading && !user} />

          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-logout-btn"
          >
            <LogOut className="w-[17px] h-[17px]" />
            <span>Sign Out</span>
          </button>

          <p className="text-[9.5px] text-white/15 text-center pb-1">
            © 2025–2026 Kavya Agri Clinic
          </p>
        </div>
      </aside>
    </>
  );
}
