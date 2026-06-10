// ─────────── Line status (enable / disable) ───────────
// A shipping line can be suspended by an admin from Settings → Danger zone.
// Suspending is a soft action: the line and all its records stay intact, but
// the line stops accepting NEW bookings and its future voyages drop off the
// storefront. Existing bookings are honored. Re-enabling fully restores it.
//
// Status lives in its own localStorage map (keyed by lineId) rather than on the
// seed `Line` type, so the static `lines` array stays the source of identity
// and status stays a mutable per-line overlay — same split used by account
// profiles (loadAccount/saveAccount) and per-line settings.

import { useEffect, useState } from "react";

export type LineStatus = "active" | "suspended";

const STORAGE_KEY = "tripket.line-status";
// Fired whenever any line's status changes, so live UI (the switcher) can
// re-read without polling. localStorage doesn't notify the same tab on its own.
const STATUS_EVENT = "tripket.line-status:change";

type StatusMap = Record<string, LineStatus>;

function readMap(): StatusMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StatusMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: StatusMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** A line is active unless it has been explicitly suspended. */
export function getLineStatus(lineId: string): LineStatus {
  return readMap()[lineId] ?? "active";
}

export function isLineSuspended(lineId: string): boolean {
  return getLineStatus(lineId) === "suspended";
}

/** Suspend or re-activate a line. Admin-gated at the call site. */
export function setLineStatus(lineId: string, status: LineStatus): void {
  const map = readMap();
  if (status === "active") {
    delete map[lineId]; // active is the default — keep the map sparse
  } else {
    map[lineId] = status;
  }
  writeMap(map);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STATUS_EVENT));
  }
}

/**
 * Reactive read of a single line's status. Re-renders when that line (or any
 * line) is suspended/re-activated via setLineStatus, so the switcher and
 * Settings stay in sync without a page reload.
 */
export function useLineStatus(lineId: string): LineStatus {
  const [status, setStatus] = useState<LineStatus>("active");
  useEffect(() => {
    const sync = () => setStatus(getLineStatus(lineId));
    sync();
    window.addEventListener(STATUS_EVENT, sync);
    window.addEventListener("storage", sync); // other tabs
    return () => {
      window.removeEventListener(STATUS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [lineId]);
  return status;
}
