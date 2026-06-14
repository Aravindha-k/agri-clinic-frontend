import { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import PageErrorBoundary from "./PageErrorBoundary";
import { Outlet, useLocation } from "react-router-dom";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { logOverlayState, startOverlayObserver } from "../../utils/overlayDebug";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef(null);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    logOverlayState({
      modalOpen: false,
      drawerOpen: sidebarOpen,
      backdropRendered: sidebarOpen && !isDesktop,
      route: location.pathname,
    });
    return startOverlayObserver({
      drawerOpen: sidebarOpen,
      route: location.pathname,
    });
  }, [sidebarOpen, isDesktop, location.pathname]);

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-shell__main flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen((open) => !open)} />
        <main ref={mainRef} className="app-shell__content flex-1 overflow-y-auto overflow-x-hidden">
          <PageErrorBoundary resetKey={location.pathname}>
            <div key={location.pathname} className="page-enter">
              <Outlet />
            </div>
          </PageErrorBoundary>
        </main>
      </div>
    </div>
  );
}
