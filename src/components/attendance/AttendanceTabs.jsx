import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/attendance", label: "Dashboard", end: true },
  { to: "/attendance/records", label: "Daily Records" },
  { to: "/attendance/reports", label: "Reports" },
  { to: "/attendance/employees", label: "Employees" },
  { to: "/attendance/shops", label: "Shops" },
  { to: "/attendance/devices", label: "Devices" },
  { to: "/attendance/biometric-enrollment", label: "Biometric Enrollment" },
];

/** Horizontal sub-navigation shared by all Attendance admin pages. */
export default function AttendanceTabs() {
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-slate-200 -mt-1 mb-4"
      aria-label="Attendance sections"
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `whitespace-nowrap px-3 py-2 text-[13px] font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
              isActive
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/60"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
