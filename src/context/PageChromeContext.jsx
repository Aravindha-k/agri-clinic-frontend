import { createContext, useCallback, useContext, useMemo, useState } from "react";

const PageChromeContext = createContext(null);

/**
 * Shared shell chrome — PageHeader publishes title/subtitle/badge/actions;
 * Header renders them in one continuous surface with utilities.
 */
export function PageChromeProvider({ children }) {
  const [chrome, setChromeState] = useState(null);

  const setChrome = useCallback((next) => {
    setChromeState(next);
  }, []);

  const clearChrome = useCallback(() => {
    setChromeState(null);
  }, []);

  const value = useMemo(
    () => ({ chrome, setChrome, clearChrome }),
    [chrome, setChrome, clearChrome]
  );

  return (
    <PageChromeContext.Provider value={value}>{children}</PageChromeContext.Provider>
  );
}

export function usePageChrome() {
  return useContext(PageChromeContext);
}
