import { Component } from "react";
import { NavLink } from "react-router-dom";

/**
 * Prevents one broken nav item (e.g. invalid icon) from blanking the whole sidebar.
 */
class NavItemErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err) {
    console.warn("[Sidebar] Nav item render failed:", this.props.label, err);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.path !== this.props.path) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] text-white/35 border border-white/5"
          title="This menu item failed to load"
        >
          <span className="w-[17px] h-[17px] rounded bg-white/10 flex-shrink-0" />
          <span className="truncate">{this.props.label}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

function isValidIcon(Icon) {
  return typeof Icon === "function" || (typeof Icon === "object" && Icon !== null);
}

export default function SidebarNavItem({ item, onClose }) {
  const Icon = item?.icon;
  const label = item?.label ?? "Menu";
  const path = item?.path ?? "#";

  if (!path || path === "#") {
    return null;
  }

  const iconOk = isValidIcon(Icon);
  const SafeIcon = iconOk
    ? Icon
    : () => (
        <span className="w-[17px] h-[17px] rounded bg-white/15 inline-block flex-shrink-0" />
      );

  return (
    <NavItemErrorBoundary label={label} path={path}>
      <NavLink
        to={path}
        onClick={onClose}
        className={({ isActive }) =>
          `sidebar-nav-item relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group
          ${isActive ? "sidebar-nav-item--active text-white" : "text-white/55 hover:text-white/90"}`
        }
        style={({ isActive }) =>
          isActive
            ? undefined
            : { border: "1px solid transparent" }
        }
        onMouseEnter={(e) => {
          if (!e.currentTarget.getAttribute("aria-current")) {
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
            {isActive && (
              <span
                className="sidebar-nav-item__indicator"
                aria-hidden="true"
              />
            )}
            <SafeIcon
              className={`w-[17px] h-[17px] flex-shrink-0 transition-all duration-200 ${
                isActive
                  ? "text-emerald-400"
                  : "text-white/40 group-hover:text-emerald-400/70"
              }`}
            />
            <span className="flex-1 transition-all">{label}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-80" />
            )}
          </>
        )}
      </NavLink>
    </NavItemErrorBoundary>
  );
}
