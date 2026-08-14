/**
 * Shared debounce helper for list search inputs.
 * @param {(...args: any[]) => void} fn
 * @param {number} waitMs
 */
export function debounce(fn, waitMs = 300) {
  let timer = null;
  const debounced = (...args) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  };
  debounced.cancel = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
  };
  return debounced;
}
