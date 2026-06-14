import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, LayoutDashboard, Sprout, Leaf, Users, MapPin } from "lucide-react";
import { NAV_SECTIONS } from "./navConfig";

const QUICK_LINKS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, keywords: "home overview" },
  { label: "Farmers", path: "/farmers", icon: Sprout, keywords: "farmer grower" },
  { label: "Visits", path: "/visits", icon: Leaf, keywords: "field visit" },
  { label: "Employees", path: "/employees", icon: Users, keywords: "staff team" },
  { label: "Live Tracking", path: "/tracking", icon: MapPin, keywords: "gps map location" },
];

function buildSearchIndex(sections) {
  const nav = Array.isArray(sections) ? sections : [];
  const fromNav = nav.flatMap((section) =>
    (section.items ?? []).map((item) => ({
      label: item.label,
      path: item.path,
      icon: item.icon,
      section: section.label,
      keywords: `${item.label} ${section.label}`.toLowerCase(),
    }))
  );
  const seen = new Set();
  return [...QUICK_LINKS, ...fromNav].filter((entry) => {
    if (!entry.path || seen.has(entry.path)) return false;
    seen.add(entry.path);
    return true;
  });
}

export default function GlobalSearch({ className = "" }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const searchIndex = useMemo(() => buildSearchIndex(NAV_SECTIONS), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchIndex.slice(0, 8);
    return searchIndex.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.includes(q))
    ).slice(0, 8);
  }, [query, searchIndex]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (path) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  const onKeyDown = (e) => {
    if (!open && e.key === "ArrowDown") {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && results[activeIdx]) {
      e.preventDefault();
      go(results[activeIdx].path);
    }
  };

  return (
    <div ref={wrapRef} className={`header-search ${className}`}>
      <Search className="header-search__icon" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search pages…"
        className="header-search__input"
        aria-label="Search admin pages"
        aria-expanded={open}
        aria-controls="global-search-results"
      />
      <kbd className="header-search__kbd hidden lg:inline-flex">⌘K</kbd>

      {open && results.length > 0 && (
        <div id="global-search-results" className="header-search__panel" role="listbox">
          <p className="header-search__panel-label">Go to</p>
          <ul className="header-search__list">
            {results.map((item, idx) => {
              const Icon = item.icon ?? Search;
              return (
                <li key={item.path}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={idx === activeIdx}
                    className={`header-search__item ${idx === activeIdx ? "header-search__item--active" : ""}`}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => go(item.path)}
                  >
                    <span className="header-search__item-icon">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-medium text-slate-800 truncate">{item.label}</span>
                      {item.section && (
                        <span className="block text-[10px] text-slate-400 truncate">{item.section}</span>
                      )}
                    </span>
                    {idx === activeIdx && <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
