// ─────────── Schedule series store ───────────
// A recurring schedule created in the Voyages wizard expands into many Voyage
// calendar records. Those records only keep *display* values, so to EDIT a
// schedule later we must retain the originating wizard payload. We keep it here
// keyed by a stable seriesId; every voyage from that batch is tagged with the
// same seriesId. Same localStorage-overlay pattern as custom-lines/ports.

import type { CreatedSchedule } from "@/components/CreateScheduleModal";

const STORAGE_KEY = "tripket.schedule-series";

type SeriesMap = Record<string, CreatedSchedule>;

function read(): SeriesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SeriesMap) : {};
  } catch {
    return {};
  }
}

function write(map: SeriesMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function getSeries(seriesId: string): CreatedSchedule | null {
  return read()[seriesId] ?? null;
}

/** Store (or overwrite) the wizard payload for a series. */
export function saveSeries(seriesId: string, payload: CreatedSchedule): void {
  const map = read();
  map[seriesId] = payload;
  write(map);
}
