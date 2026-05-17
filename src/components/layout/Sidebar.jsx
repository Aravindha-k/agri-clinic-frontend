import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Sprout, Leaf, AlertTriangle, MapPin,
  LogOut, X, ClipboardCheck, BarChart3, Bell, Database, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import SidebarNavItem from "./SidebarNavItem";
import logo from "../../assets/logo.png";

/** Static nav — never depends on user/role so sidebar stays populated while auth loads. */
export const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Employees", icon: Users, path: "/employees" },
      { label: "Farmers", icon: Sprout, path: "/farmers" },
    ],
  },
  {
    label: "Field Operations",
    items: [
      { label: "Visits", icon: Leaf, path: "/visits" },
      { label: "Crop Issues", icon: AlertTriangle, path: "/crop-issues" },
      { label: "Recommendations", icon: ClipboardCheck, path: "/recommendations" },
      { label: "Live Tracking", icon: MapPin, path: "/tracking" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Masters", icon: Database, path: "/masters" },
      { label: "Reports", icon: BarChart3, path: "/reports" },
      { label: "Notifications", icon: Bell, path: "/notifications" },
      { label: "Audit Log", icon: ShieldCheck, path: "/audit" },
    ],
  },
];

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
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
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

        <div className="relative z-10 px-5 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              }}
            >
              <img src={logo} alt="Kavya Agri" className="w-8 h-8 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[14.5px] font-bold text-white leading-tight tracking-tight truncate">
                Kavya Agri Clinic
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10.5px] text-emerald-400/80 font-medium">Admin Panel</p>
              </div>
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
              <p className="px-3 mb-1.5 text-[9.5px] font-bold text-white/25 uppercase tracking-[0.14em]">
                {section.label}
              </p>
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
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-white/40 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
            style={{ border: "1px solid transparent" }}
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
