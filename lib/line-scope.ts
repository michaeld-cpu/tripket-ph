// ─────────── Line scoping ───────────
// Single chokepoint for reading the stored voyages, optionally narrowed to one
// shipping line. Operators are locked to their line (locked=true) so every
// derived surface — voyages, bookings, tickets, reports — only ever sees their
// own data. Admins pass locked=false and see whichever line the switcher is on
// (or all, when we later want an all-lines view).

import type { StoredVoyage } from "@/lib/bookings-data";

/** Read + parse `tripket.voyages`. Returns [] on the server or when empty. */
export function readStoredVoyages(): StoredVoyage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("tripket.voyages");
    return raw ? (JSON.parse(raw) as StoredVoyage[]) : [];
  } catch {
    return [];
  }
}

/**
 * Voyages scoped to a line. When `locked` (operator), only voyages tagged with
 * `lineId` are returned. When not locked (admin), all stored voyages pass
 * through — the active-line filtering for admins happens via the switcher in
 * the UI, not here.
 */
export function loadScopedVoyages(lineId: string, locked: boolean): StoredVoyage[] {
  const all = readStoredVoyages();
  if (!locked) return all;
  return all.filter((v) => v.lineId === lineId);
}
