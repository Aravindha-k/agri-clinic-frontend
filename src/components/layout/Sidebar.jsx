import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Sprout, Leaf, AlertTriangle, MapPin,
  LogOut, X, ClipboardCheck, BarChart3, Bell, Database, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.png";

const NAV_SECTIONS = [
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

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try { await logout(); } catch {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
    }
    navigate("/login");
  };

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.username || "Admin";

  const role = user?.is_staff ? "Administrator" : "Field Agent";
  const initials = (user?.first_name?.[0] || user?.username?.[0] || "A").toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky lg:top-0 left-0 top-0 h-screen z-40 w-[260px] flex flex-col
          transition-transform duration-300 ease-in-out select-none`}
        style={{
          background: "linear-gradient(180deg, #071d10 0%, #0b2818 22%, #0f3520 55%, #134529 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "4px 0 32px rgba(0,0,0,0.28)",
          transform: isOpen || typeof window !== "undefined" && window.innerWidth >= 1024
            ? "translateX(0)"
            : isOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Subtle grid texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Radial glow behind logo */}
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle at 30% 20%, rgba(34,197,94,0.08) 0%, transparent 65%)" }}
        />

        {/* Close — mobile */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 z-10 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Brand ── */}
        <div className="relative z-10 px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)",
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

        {/* ── Divider ── */}
        <div className="mx-4 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />

        {/* ── Navigation ── */}
        <nav className="relative z-10 flex-1 px-3 py-3 overflow-y-auto space-y-4
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[9.5px] font-bold text-white/25 uppercase tracking-[0.14em]">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group
                      ${isActive
                        ? "text-white"
                        : "text-white/50 hover:text-white/85"
                      }`
                    }
                    style={({ isActive }) => isActive ? {
                      background: "linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(16,185,129,0.10) 100%)",
                      border: "1px solid rgba(34,197,94,0.20)",
                      boxShadow: "0 2px 12px rgba(34,197,94,0.12)",
                    } : {
                      border: "1px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.classList.contains("active")) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.getAttribute("aria-current")) {
                        e.currentTarget.style.background = "";
                      }
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active bar */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
                            style={{ background: "linear-gradient(180deg, #4ade80, #22c55e)" }} />
                        )}

                        <item.icon
                          className={`w-[17px] h-[17px] flex-shrink-0 transition-all duration-200 ${isActive
                            ? "text-emerald-400"
                            : "text-white/40 group-hover:text-emerald-400/70"
                            }`}
                        />
                        <span className="flex-1 transition-all">{item.label}</span>

                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-80" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Bottom: User card + Logout ── */}
        <div className="relative z-10 p-3 space-y-2">
          <div className="h-px mx-1" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)" }} />

          {/* User info card */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs text-white"
              style={{ background: "linear-gradient(135deg, #16a34a 0%, #065f46 100%)", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-white/90 truncate leading-tight">{displayName}</p>
              <p className="text-[10px] text-emerald-400/60 truncate">{role}</p>
            </div>
          </div>

          <button
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
