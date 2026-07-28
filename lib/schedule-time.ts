/**
 * Departure-time helpers for the schedule wizard.
 *
 * Schedule slots are stored as **minutes-of-day** (0–1439) so departures can
 * land on any minute (e.g. 8:30 AM, 6:45 PM) — different vessels rarely leave
 * exactly on the hour.
 *
 * Backward compatibility: the original model stored whole 24h *hours* (4–23).
 * `normalizeSlot` upgrades any legacy value in that range to minutes, so old
 * saved series keep working after this change. Values ≥ 24 are already minutes.
 */

// Operating window — 4:00 AM through 11:59 PM.
export const MIN_MINUTES = 4 * 60; // 240
export const MAX_MINUTES = 23 * 60 + 59; // 1439

/** Whole-hour tiles used by the quick-add grid (4 AM … 11 PM). */
export const HOUR_RANGE = Array.from({ length: 23 - 4 + 1 }, (_, i) => (4 + i) * 60);

/** hour → minutes-of-day. */
export const hourToMin = (h: number): number => h * 60;

export const hourOf = (mins: number): number => Math.floor(mins / 60);
export const minuteOf = (mins: number): number => mins % 60;

/**
 * Upgrade a stored slot to minutes-of-day. Legacy series stored hours (0–23);
 * anything below 24 is interpreted as an hour and scaled. Values ≥ 24 are
 * already minutes and pass through untouched.
 */
export function normalizeSlot(n: number): number {
  return n < 24 ? n * 60 : n;
}

/** Normalize + de-dupe + sort a stored slot array. */
export function normalizeSlots(arr: number[] | undefined): number[] {
  if (!arr || arr.length === 0) return [];
  return Array.from(new Set(arr.map(normalizeSlot))).sort((a, b) => a - b);
}

/** minutes-of-day → "8:30 AM" (drops ":00" so on-the-hour reads cleanly). */
export function fmtTime(mins: number): string {
  const h = hourOf(mins);
  const m = minuteOf(mins);
  const period = h < 12 ? "AM" : "PM";
  const h12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** minutes-of-day → "08:30" for a native <input type="time">. */
export function toTimeInput(mins: number): string {
  return `${String(hourOf(mins)).padStart(2, "0")}:${String(minuteOf(mins)).padStart(2, "0")}`;
}

/** "08:30" (from a native time input) → minutes-of-day, or null if unparseable. */
export function fromTimeInput(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  if (!Number.isFinite(mins) || mins < 0 || mins > MAX_MINUTES) return null;
  return mins;
}
