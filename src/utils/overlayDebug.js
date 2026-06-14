/**
 * Development helper: log and inspect stuck viewport overlays.
 */
export function logOverlayState(context = {}) {
  if (!import.meta.env.DEV) return;

  const backdrops = document.querySelectorAll(
    '.fixed.inset-0, [class*="fixed"][class*="inset-0"]'
  );
  const blurLayers = document.querySelectorAll('[class*="backdrop-blur"]');
  const bodyClasses = document.body.className || "(none)";

  const layers = Array.from(backdrops).map((el) => ({
    tag: el.tagName.toLowerCase(),
    classes: el.className,
    zIndex: getComputedStyle(el).zIndex,
    opacity: getComputedStyle(el).opacity,
    pointerEvents: getComputedStyle(el).pointerEvents,
    display: getComputedStyle(el).display,
    hidden: el.hidden || el.getAttribute("aria-hidden") === "true",
  }));

  console.debug("[overlay-debug]", {
    ...context,
    bodyClasses,
    backdropCount: backdrops.length,
    blurLayerCount: blurLayers.length,
    layers,
  });
}

export function startOverlayObserver(context = {}) {
  if (!import.meta.env.DEV || typeof MutationObserver === "undefined") {
    return () => {};
  }

  let timer = null;
  const schedule = () => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => logOverlayState(context), 120);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "aria-hidden"],
  });
  schedule();

  return () => {
    observer.disconnect();
    if (timer) window.clearTimeout(timer);
  };
}
