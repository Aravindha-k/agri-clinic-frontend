import { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import PageErrorBoundary from "./PageErrorBoundary";
import { Outlet, useLocation } from "react-router-dom";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { logOverlayState, startOverlayObserver } from "../../utils/overlayDebug";
import { PageChromeProvider } from "../../context/PageChromeContext";
import {
  SoftRefreshProvider,
  SoftRefreshSettleWatcher,
  useSoftRefresh,
} from "../../context/SoftRefreshContext";

function LayoutOutlet() {
  const location = useLocation();
  const soft = useSoftRefresh();
  const refreshKey = soft?.refreshKey ?? 0;

  return (
    <PageErrorBoundary resetKey={`${location.pathname}:${refreshKey}`}>
      <div key={`${location.pathname}:${refreshKey}`} className="page-enter">
        <Outlet />
      </div>
    </PageErrorBoundary>
  );
}

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
    <PageChromeProvider>
      <SoftRefreshProvider>
        <div className="app-shell flex h-screen overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="app-shell__main flex-1 flex flex-col min-w-0 overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen((open) => !open)} />
            <main
              ref={mainRef}
              className="app-shell__content flex-1 overflow-y-auto overflow-x-hidden"
            >
              <SoftRefreshSettleWatcher rootRef={mainRef} />
              <LayoutOutlet />
            </main>
          </div>
        </div>
      </SoftRefreshProvider>
    </PageChromeProvider>
  );
}
