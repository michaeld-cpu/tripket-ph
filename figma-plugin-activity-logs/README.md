# Tripket — Build Activity Logs Section

A Figma plugin that rebuilds `app/activity-logs/page.tsx` as native Figma frames
— real text, real vectors, real measurements. Nothing is a screenshot.

Sources transcribed:

| File | What comes from it |
| --- | --- |
| `app/activity-logs/page.tsx` | the page, the table, the log-details modal |
| `lib/audit-data.ts` | `actionTone`, `areaTone`, and **all 120 seed entries** |
| `components/DateRangePicker.tsx` | the trigger and the 340px portaled popover |
| `components/Pagination.tsx` | the footer (no "Per page" here — see below) |
| `components/PageHeader.tsx` | title + "All operators" chip + Export |
| `components/Select.tsx` | the `size="sm"` subject filter and its menu |
| `components/Modal.tsx` / `Skeleton.tsx` | `max-w-xl` shell, `TableSkeleton rows={12}` |

## Install

Figma → **Plugins → Development → Import plugin from manifest…** → pick
`figma-plugin-activity-logs/manifest.json`. The plugin id is
`tripket-activity-logs-allstates`, so it installs alongside the other seven.

It creates (or reuses) a section named **`Activity logs — All states`** below
every existing section on the page, **4 frames per row** at 1440×900.

**Additive**: a frame whose name already exists is skipped, never replaced —
delete a frame and re-run to refresh just that one. If you add a frame to
`BUILDERS` later, append it at the **end** of the array; grid position derives
from the array index.

## The 10 frames

| # | Frame | State |
| --- | --- | --- |
| 01 | Today — Page 1 of 2 | the default view: range = today, 15 of 29 rows |
| 02 | Loading skeleton | `<TableSkeleton rows={12} />` during the 180ms delay |
| 03 | Scrolled to pager — Page 2 of 2 | rows 16–29, Previous / 1 2 / Next |
| 04 | Subject filter open | All subjects + the six `AuditArea` values |
| 05 | Filtered to Bookings | the six Bookings entries from today |
| 06 | Date range picker open | the 340px popover, August 2026, the 13th selected |
| 07 | No activity in this range | the `py-12` empty cell |
| 08 | Log details — With properties | `TKT-3714-A` · paid · "Ticket number assigned" |
| 09 | Log details — Empty properties | `RT-5333` · deleted · "No properties recorded." |
| 10 | Log details — System actor | the neutral slate `SY` avatar, Users area |

## Seed data is literal, not representative

`buildAuditLog()` resets its xorshift PRNG to `987654321` on every call, so the
template / line / age / actor / target sequence is fixed. I ran it to completion
and transcribed the result — these are the exact entries the app generates.

The one thing that can't be pinned is `at`, which is `Date.now() - ageMin *
60_000`. The frames are anchored at **Thu 13 Aug 2026, 2:45 PM**, which puts 29
of the 120 entries inside the default "today" range. The row *contents* are
exact; only the clock times shift with when you load the page.

## Measurements

`html { font-size: 17px }`, so `px-5` → 21.25, `py-3.5` → 14.875, `py-2.5` →
10.625, `h-6` (avatar) → 25.5, `h-9` (day cell) → 38.25, `w-36` (filter) → 153.
Literal px classes don't scale: `min-w-[940px]` on the table, the **340px**
popover width (it's a `style` prop, not a class), and `min-h-[140px]` on the
properties panel.

Derived: row height = 14.875 × 2 + max(25.5 avatar, 20.25 + 17.25 When,
20.25 + 18 Subject) = **68**; thead 40.25; toolbar 72.06; pager 56.25. The card
is ~1200px tall at 15 rows, so the pager sits below the fold — frame 03 scrolls
to it, which is what the real page does.

The August 2026 grid is built the way `buildMonthCells` builds it: the 1st is a
Saturday, so `firstWeekday = 6` and the 42 cells run Jul 26 → Sep 5.

## Things I found in the source — flagged, not fixed

1. **The audit log never names who did anything.** `STAFF = ["Someone",
   "System"]` and the actor is picked with `STAFF[Math.floor(rnd() *
   (STAFF.length - 1))]` — `length - 1` is 1, so the index is always 0. The
   comment says this is deliberate ("attributed generically"), and "System" is
   reached only through the separate `area === "Users" && rnd() < 0.4` branch.
   Net effect: **115 of 120 rows say "Someone"** under a column headed *Caused
   by*, with a one-letter `S` avatar. Attribution is the entire purpose of an
   audit trail; this is the biggest gap on the page.
2. **`lineId` is recorded on every entry and shown nowhere.** Each entry stores
   the operator's shipping line, but no column, no filter and no field in the
   details modal surfaces it. The page header says "All operators" — so a
   super-admin reading a cross-line trail cannot tell which line an action came
   from, even though the data is right there.
3. **Every row states its action twice.** The Event column renders `{e.action}`
   as a toned pill; the Subject column renders `{e.target}` with `{e.action}`
   again beneath it in slate-400. Adjacent columns, same word — visible in every
   frame.
4. **The default range has an empty-at-dawn cliff.** The page opens on
   `startOfDay(now) → endOfDay(now)`. Ages are weighted recent
   (`Math.pow(rnd(), 2)`), but "today" still means "since midnight": at 2:45 PM
   29 entries qualify, at 8 AM about 10, at 00:30 one or two — with nothing on
   screen to suggest 120 exist. A rolling "last 24 hours" default would remove
   the cliff.
5. **Nothing here is persisted, and nothing else feeds it.** Unlike users and
   bookings there is no `loadStore` / `saveStore`; `buildAuditLog()` re-runs on
   every mount and recomputes `at` from `Date.now()`. So the same event slides
   in time on every visit, and no action taken anywhere else in the app ever
   appears. The log is presentational.
6. **Rows open a modal but aren't reachable by keyboard.** The `<motion.tr>`
   carries `onClick` and `cursor-pointer` — no `role="button"`, no `tabIndex`, no
   key handler, and no visual affordance beyond the hover tint. Keyboard and
   screen-reader users can't open the details.
7. **The From/To inputs promise more precision than the filter uses.** Entries
   carry exact timestamps, but `filtered` clamps with `startOfDay` / `endOfDay`,
   so any range is whole days. Fine as a rule — just not what an `MM/DD/YYYY`
   field next to a per-minute log implies.
8. **Export is inert.** Same as every other page: `PageHeader` renders the
   button whenever `showExport` is true (the default, and this page doesn't turn
   it off) with no `onClick` and no handler prop. Drawn in the frames because
   that's what renders. Ironically this is the one page where an export would
   obviously earn its place.
9. **`rid(4)` does nothing after the first expression.**
   `String(Math.floor(rnd() * 9000) + 1000).slice(0, 4).padStart(4, "0")` — the
   value is always a 4-digit number in 1000–9999, so the `slice` and `padStart`
   can never change it. Harmless, but it reads as if shorter ids were expected.

## Fidelity notes — where I did not transcribe literally

- **`Pagination` gets no `onPageSizeChange` here**, so the "Per page" selector
  isn't rendered — which is why this page dodges the blank-selector bug the
  Accounts directories have. `PAGE_SIZE` is a fixed 15.
- **The `motion.tr` entrance stagger is not drawn** (opacity/y per row), nor the
  `hover:bg-slate-50/60` row tint or the 3px brand-500 bar that scales in on
  hover. None of these frames is a hover state.
- **The range popover is drawn in its default state** — one month, no hover
  preview range, no mid-pick state. `previewRange` only exists while a first
  date has been clicked and the pointer is moving.
- **`font-mono tabular-nums` resolves to Roboto Mono / JetBrains Mono / Space
  Mono / Courier New**, whichever your Figma has, falling back to the body family.

## Verification

`node --check` plus the stubbed-Figma smoke harness (`smoke-logs.js`) runs all
10 builders outside Figma and checks reference errors, node counts, duplicate
frame names, `setRangeFills` / `setRangeFontName` range validity, dialog height
against the 810px `max-h-[90vh]` cap, frames overflowing 1440×900, and NaN
geometry. All 10 build clean. The layout was also rendered from the built node
tree to SVG (`render-logs.js`) and eyeballed — that pass caught the month/year
heading running together in the popover header.
