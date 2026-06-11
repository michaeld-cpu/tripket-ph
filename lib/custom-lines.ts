// ─────────── Custom shipping lines (admin-added) ───────────
// The seed `lines` array in shipping-lines.ts is the built-in source of
// identity. Lines an admin adds at runtime (Switcher → "Add Shipping Line")
// live here in their own localStorage list rather than mutating that array,
// so the seed stays the stable baseline and additions are a mutable overlay —
// the same split used by line status (line-status.ts) and account profiles.

import { useEffect, useState } from "react";
import type { Line } from "./shipping-lines";

const STORAGE_KEY = "tripket.custom-lines";
// Fired when a line is added, so live UI (the switcher) re-reads without
// polling — localStorage doesn't notify the same tab on its own.
const LINES_EVENT = "tripket.custom-lines:change";

function readLines(): Line[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Line[]) : [];
  } catch {
    return [];
  }
}

function writeLines(list: Line[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function getCustomLines(): Line[] {
  return readLines();
}

/** Append an admin-added line. Admin-gated at the call site. */
export function addCustomLine(line: Line): void {
  const list = readLines();
  list.push(line);
  writeLines(list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LINES_EVENT));
  }
}

/** Reactive read of the custom-line list. Re-renders when a line is added. */
export function useCustomLines(): Line[] {
  const [list, setList] = useState<Line[]>([]);
  useEffect(() => {
    const sync = () => setList(getCustomLines());
    sync();
    window.addEventListener(LINES_EVENT, sync);
    window.addEventListener("storage", sync); // other tabs
    return () => {
      window.removeEventListener(LINES_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}
