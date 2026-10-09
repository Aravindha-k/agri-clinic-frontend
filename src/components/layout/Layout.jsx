import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  const reduce = useReducedMotion();
  const refreshKey = soft?.refreshKey ?? 0;

  return (
    <PageErrorBoundary resetKey={`${location.pathname}:${refreshKey}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          className="page-enter"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {/* Fragment key remounts the page on soft refresh without a DOM node,
              keeping `.page-enter > .page-root` selectors intact. */}
          <React.Fragment key={`${location.pathname}:${refreshKey}`}>
            <Outlet />
          </React.Fragment>
        </motion.div>
      </AnimatePresence>
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
        <div className="app-shell flex h-screen h-dvh overflow-hidden">
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
