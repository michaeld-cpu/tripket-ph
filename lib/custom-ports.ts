// ─────────── Custom ports (operator-added) ───────────
// The curated PORTS list in schedule-steps/RoutesStep.tsx is the built-in
// catalog. Ports an operator adds at runtime (Routes step → "Add new port")
// live here in their own localStorage list rather than mutating that array,
// so the seed stays the stable baseline and additions are a mutable overlay —
// same split used by custom shipping lines (custom-lines.ts).

import { useEffect, useState } from "react";
import { portId, type Port } from "@/components/schedule-steps/RoutesStep";

const STORAGE_KEY = "tripket.custom-ports";
// Fired when a port is added, so live UI re-reads without polling.
const PORTS_EVENT = "tripket.custom-ports:change";

function readPorts(): Port[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Port[]) : [];
  } catch {
    return [];
  }
}

function writePorts(list: Port[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function getCustomPorts(): Port[] {
  return readPorts();
}

/** Append an operator-added port. No-op only if the exact port (same city code
 *  AND name) already exists — multiple named terminals can share a city code. */
export function addCustomPort(port: Port): void {
  const list = readPorts();
  if (list.some((p) => portId(p) === portId(port))) return;
  list.push(port);
  writePorts(list);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PORTS_EVENT));
  }
}

/** Reactive read of the custom-port list. Re-renders when a port is added. */
export function useCustomPorts(): Port[] {
  const [list, setList] = useState<Port[]>([]);
  useEffect(() => {
    const sync = () => setList(getCustomPorts());
    sync();
    window.addEventListener(PORTS_EVENT, sync);
    window.addEventListener("storage", sync); // other tabs
    return () => {
      window.removeEventListener(PORTS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}
