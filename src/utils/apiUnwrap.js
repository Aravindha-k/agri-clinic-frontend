/**
 * Unwrap backend envelopes: { success, message, data } on axios or plain bodies.
 * DRF paginated { count, results } and plain JSON pass through unchanged.
 */

function isAxiosResponse(value) {
  return (
    value != null &&
    typeof value === "object" &&
    value.config != null &&
    value.status != null &&
    value.data !== undefined
  );
}

/** Raw HTTP body from axios response or plain object. */
export function getResponseBody(payload) {
  if (payload == null) return null;
  return isAxiosResponse(payload) ? payload.data : payload;
}

/** Unwrap only when success === true; never strip DRF pagination or plain objects. */
export function unwrapSuccessEnvelope(payload) {
  const body = getResponseBody(payload);
  if (body == null) return null;

  if (typeof body === "object" && body.success === true && body.data !== undefined) {
    return body.data;
  }

  return body;
}

/** Extract array from list endpoints (DRF results, features, plain arrays). */
export function resolveList(payload) {
  const raw = unwrapSuccessEnvelope(payload) ?? getResponseBody(payload) ?? payload;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.results)) return raw.results;
  if (raw?.data && typeof raw.data === "object" && Array.isArray(raw.data.results)) {
    return raw.data.results;
  }
  if (Array.isArray(raw?.features)) return raw.features;
  if (Array.isArray(raw?.employees)) return raw.employees;
  if (Array.isArray(raw?.locations)) return raw.locations;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
}

/** Find DRF paginated block: { count, results, next?, previous? } */
function pickPaginatedBlock(raw) {
  if (raw == null || typeof raw !== "object") return null;
  if (Array.isArray(raw.results)) return raw;

  const nested = raw.data;
  if (nested && typeof nested === "object") {
    if (Array.isArray(nested.results)) return nested;
    for (const key of ["items", "issues", "recommendations", "records", "list"]) {
      if (Array.isArray(nested[key])) {
        return {
          count: nested.count ?? nested.total ?? nested[key].length,
          results: nested[key],
          next: nested.next ?? null,
          previous: nested.previous ?? null,
        };
      }
    }
  }

  for (const key of ["items", "issues", "recommendations", "records", "list"]) {
    if (Array.isArray(raw[key])) {
      return {
        count: raw.count ?? raw.total ?? raw[key].length,
        results: raw[key],
        next: raw.next ?? null,
        previous: raw.previous ?? null,
      };
    }
  }

  return null;
}

/** Normalized paginated list: { results, count, next, previous }. */
export function resolvePaginated(payload) {
  let raw = unwrapSuccessEnvelope(payload);
  if (raw == null) raw = getResponseBody(payload);

  if (Array.isArray(raw)) {
    return { results: raw, count: raw.length, next: null, previous: null };
  }

  const block = pickPaginatedBlock(raw);
  if (block) {
    return {
      results: block.results,
      count: typeof block.count === "number" ? block.count : block.results.length,
      next: block.next ?? null,
      previous: block.previous ?? null,
    };
  }

  return { results: [], count: 0, next: null, previous: null };
}

/** Fetch every page when API returns paginated { next } links. */
export async function fetchAllPaginated(fetchPage, initialParams = {}) {
  let page = 1;
  const pageSize = initialParams.page_size ?? 100;
  const combined = [];
  let lastMeta = { count: 0, next: null, previous: null };

  for (let guard = 0; guard < 100; guard += 1) {
    const batch = await fetchPage({ ...initialParams, page, page_size: pageSize });
    combined.push(...(batch.results ?? []));
    lastMeta = batch;
    if (!batch.next) break;
    page += 1;
  }

  return {
    results: combined,
    count: typeof lastMeta.count === "number" ? lastMeta.count : combined.length,
    next: null,
    previous: null,
    pagesLoaded: page,
  };
}
