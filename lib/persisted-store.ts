// ─────────── Per-line localStorage helpers ───────────
// Generic read/write wrappers used by the vessels, routes, users, and
// bookings pages so their mutations survive a refresh. Each store is
// keyed by `<namespace>.<lineId>` — the active shipping line decides
// which slice loads. Operators only ever see their own line's data.

/** Build the localStorage key for a (namespace, line) pair. */
export function storeKey(namespace: string, lineId: string): string {
  return `tripket.${namespace}.${lineId}`;
}

/** Read a persisted slice for the active line. Returns null when nothing
 *  is stored yet so callers can fall through to seeding mock data. */
export function loadStore<T>(namespace: string, lineId: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storeKey(namespace, lineId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Write a slice. Swallows quota errors — this is mock infra, not the
 *  real backend, and a failed save shouldn't crash a dashboard. */
export function saveStore<T>(namespace: string, lineId: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storeKey(namespace, lineId), JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
