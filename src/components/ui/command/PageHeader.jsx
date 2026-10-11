import { useLayoutEffect } from "react";
import { usePageChrome } from "../../../context/PageChromeContext";

/**
 * Publishes page title chrome into the shared shell Header.
 * Renders nothing in-page when the shell provider is present (avoids duplicate titles).
 */
export default function PageHeader({ title, subtitle, badge, actions, className = "" }) {
  const ctx = usePageChrome();
  const setChrome = ctx?.setChrome;
  const clearChrome = ctx?.clearChrome;

  useLayoutEffect(() => {
    if (!setChrome) return undefined;
    setChrome({ title, subtitle, badge, actions, className });
    return () => {
      clearChrome?.();
    };
  }, [setChrome, clearChrome, title, subtitle, badge, actions, className]);

  /* Fallback if ever used outside Layout (e.g. isolated tests) */
  if (!ctx) {
    return (
      <div className={`page-header page-header--premium ${className}`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="page-title">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">{actions}</div>
        )}
      </div>
    );
  }

  return null;
}
