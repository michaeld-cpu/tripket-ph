# Tripket — Build "Routes — All states (v3)"

A second Figma plugin, separate from the Tickets one. It builds **31 frames**
from the current `app/routes/page.tsx` into a **brand-new section** it creates
itself — your existing "Routes — All states" frames are never touched.

This is a full rebuild against the August 2026 routes rewrite. The v2 section is
left where it is; v3 lands in its own section so you can compare before deleting.

## Install & run

1. Open **Tripket.ph** in the **Figma desktop app**.
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Pick `manifest.json` from **this** folder (`figma-plugin-routes/`).
   It installs alongside the Tickets plugin — different `id`, different entry.
4. Menu → **Plugins → Development → Tripket — Build Routes Section**.

The plugin finds the page holding your Tickets section, measures the bottom of
every section on it, and drops a new **"Routes — All states (v3)"** section
400px clear of everything. Re-runs are additive: it reuses that section and only
builds frame names that aren't in it yet — so deleting one frame and re-running
rebuilds just that frame.

The section lays out **4 frames per row** (`GRID_COLS = 4`), matching the
Vessels plugin. The Tickets plugin is still on 3 — same one-line change near the
`GRID_COLS` constant if you want all three to agree.

## What changed since v2

| Area | Then | Now |
|---|---|---|
| Assign vessel | `CreateRouteModal` in `assign` mode — RouteContextCard + a two-column multi-select `AssignVesselsEditor` | Standalone `AssignVesselDialog` — single-select list, Current/New vessel header, confirm locked until the pick differs |
| Cancel a route | One dialog: booking list → "Mark all refunded & cancel" | Two steps: `CancelConfirmDialog` captures a **required reason**, then hands off to the refund dialog |
| Cancelled rows | Menu item 1 was **Mark Departed**, disabled | Menu item 1 is **Mark Scheduled** (reinstate); **Refund bookings** appended |
| Row-menu colour | `tone` was ignored — everything slate except `danger` | `RowMenu` honours `tone`: emerald (advance), amber (reverse), rose (destructive) |
| Departed filter | Silently discarded — `optionalDateRange` wasn't in the union | Real optional window with a placeholder trigger and a Clear button |
| Page size | Fixed at 10; `onPageSizeChange` went nowhere | Real **Per page** control (10 / 25 / 50 / 100) in the pager |
| Pager | Hidden when everything fit on one page | Always renders — it now carries the page's only running count |
| Card header | `Showing N of M routes` sub-line | Removed; the count moved to the pager |
| Schedule column | Static header | Sortable, with a direction arrow; two-line date + weekday |

## The 31 frames

**Configured routes (01–08)**

| # | Frame | State |
|---|---|---|
| 01 | View configured routes — Loading | `TableSkeleton rows={9}` |
| 02 | View configured routes — Default list | Page 1 descending, `Showing 1–10 of 26 routes` |
| 03 | Sort by schedule — Ascending | Arrow flipped; the three early Departed legs surface |
| 04 | Filter — No results | `No routes match your filters.` — and a pager showing `0–0 of 0` |
| 05 | Open route filters — Dialog open | Six fields, Departed window unset |
| 06 | Apply filters — Filters applied | Active-count badge on the Filters button |
| 07 | Go to next page — Page 2 | Rows 11–20, second Cancelled leg + the RT-0001 Departed leg |
| 08 | Rows per page — Selector open | Native `<select>` popup, 10 / 25 / 50 / 100 |

**Route actions (01–05)** — the row menu, one frame per guard set

| # | Frame | Menu |
|---|---|---|
| 01 | Scheduled route | Mark Departed (emerald) · Assign vessel · Disable route (rose) · Cancel route (rose) |
| 02 | Departed route | Item 1 swaps to **Mark Scheduled** (amber); Cancel route locked |
| 03 | Cancelled route | **Mark Scheduled** (amber) · Assign vessel locked · Cancel reads **Cancelled**, locked · **Refund bookings** (amber) appended |
| 04 | Inactive route | Item 3 swaps to **Enable route** (emerald) |
| 05 | Locked by bookings | Assign vessel + Disable route both locked |

**Assign vessel (01–05)** — `components/AssignVesselDialog.tsx`

| # | Frame | State |
|---|---|---|
| 01 | Dialog open — Current vessel preselected | Seeded to the leg's hull, so **Assign Vessel** starts disabled |
| 02 | New vessel picked — Ready to assign | Current ≠ New, button live |
| 03 | Unassigned leg — Nothing picked | Current reads `Unassigned`, New reads `—`, nothing selected |
| 04 | Search vessels — No matches | `No vessels match your search.` |
| 05 | Vessel assigned — Toast | `Vessel assigned to Cebu City → Dumaguete City` |

**Route status (01–02)** — the Active/Inactive confirm

| # | Frame | State |
|---|---|---|
| 01 | Disable route — Confirm dialog | `RouteStatusDialog` rose variant |
| 02 | Enable route — Confirm dialog | `RouteStatusDialog` emerald variant |

**Lifecycle (01–09)**

| # | Frame | State |
|---|---|---|
| 01 | Mark Departed — Set actual departure | Amber badge, datetime-local field |
| 02 | Cancel route — Reason required | Placeholder, **Mark Cancelled** disabled |
| 03 | Cancel route — Reason menu open | The three `ROUTE_CANCEL_REASONS` |
| 04 | Cancel route — Reason selected | Bad weather / port closure; confirm live |
| 05 | Cancel route — Others, free text | Textarea unlocked and filled |
| 06 | Cancel route — Validation error | Others chosen, textarea empty, rose ring + message |
| 07 | Refund bookings — Bookings to refund | Amber chrome, `To Refund` badges, 12-row list, `Showing 1–12 of 28` |
| 08 | Refund bookings — Nothing left to refund | Empty state; **Mark all refunded** locked to amber-300 |
| 09 | Refund complete — Toast | `12 bookings marked Refunded` |

**Create route (01–02)**

| # | Frame | State |
|---|---|---|
| 01 | Details step — Empty form | Stepper on step 1, dashed port pickers, Continue disabled |
| 02 | Review step — Ready to create | Brand hero card, Details list, **Create route** |

## The cancel flow, as the code actually runs it

Worth spelling out, because it's the biggest change and the frames only make
sense read in order:

1. Row menu → **Cancel route** sets `cancelRoute`, which opens
   `CancelConfirmDialog` (frames Lifecycle 02–06). A reason is **required**;
   `Others` unlocks free text and the confirm button stays `bg-rose-300` until
   the choice validates.
2. Confirming calls `completeCancel(route, reason)` — it writes
   `status: "Cancelled"` **and** `cancelReason`, closes itself, and immediately
   sets `refundRoute`.
3. That opens `CancelRouteDialog` with `mode="refund"` (frames Lifecycle 07–08):
   amber chrome, the list filtered to unrefunded bookings, `Mark all refunded`.
4. **Refund bookings** on a Cancelled row re-enters at step 3, sweeping up
   anything booked after the cancellation. It reports through a toast (frame 09).
5. **Mark Scheduled** on a Cancelled row clears `departedAt` *and*
   `cancelReason`, so a reinstated leg carries no stale reason.

## Things I found in the source you may want to know

Real behaviours in the current code, reproduced faithfully in the frames.
Several look like bugs — flagging rather than silently "fixing" them.

1. **`CancelRouteDialog`'s `"cancel"` mode is now dead code from Routes.**
   The component still supports the rose "Cancel this trip?" variant, but the
   page only ever mounts it as `route={refundRoute} mode="refund"` — the cancel
   path goes through `CancelConfirmDialog` instead. No frame is built for the
   rose variant because Routes can't reach it. If Bookings still uses it, fine;
   if nothing does, the branch can go.

2. **The cancel reason is captured but never displayed.** `Route.cancelReason`
   is written on cancel and cleared on reinstate, and the dialog tells the admin
   *"The passenger sees this reason in their booking app"* — but nothing on the
   Routes page renders it. No column, no tooltip, no row detail. Either surface
   it on the Cancelled row or the copy is writing a cheque the UI doesn't cash.

3. **`completeCancel` refunds nothing by itself.** It sets the status and opens
   the refund dialog. If the admin closes that dialog, the leg is Cancelled with
   its bookings untouched — which is exactly what **Refund bookings** exists to
   clean up, but it does mean "cancelled" and "refunded" can drift apart.

4. **No `Route` in `MOCK_ROUTES` is unassigned any more.** `r9`/`r10` used to
   carry `vessel: ""`; both now have `MV Reina del Cielo`, so the table's
   `Unassigned` branch never renders from seed data. Assign-vessel frame 03
   still documents it (the dialog handles `currentVessel: ""` explicitly), but
   you won't see it in the table until a route ships without a hull.

5. **There is still no "Add route" button.** `CreateRouteModal` is mounted with
   `open={createOpen}` but nothing calls `setCreateOpen(true)` — the Create
   route frames document UI that is currently unreachable.

6. **The page has no search field.** Only a Filters button. The local `Input`,
   `FieldGroup` and `SortIcon` helpers are defined but never rendered.
   (`SortIcon` in particular is now fully superseded by `SortArrow`.)

7. **`showExport` defaults to `true`.** `PageHeader` gets only `title` and
   `showDateFilter={false}`, so an Export button renders in the header. Frames
   include it; drop it from the page if it wasn't intended.

8. **The Active column is a pill, not a toggle** — no `onClick`, no `button`.
   Enabling/disabling happens only through the row menu → `RouteStatusDialog`.

9. **Duration is a single averaged number.** `[low, high]` is collapsed to its
   mean inline (`hrs avg`), and the create form has one "Average duration"
   input that writes both fields.

10. **The table has no `min-w` and no scroll container.** Eleven
    `whitespace-nowrap` columns at `px-5` exceed the 1117px content column at
    1440, so the table runs past the card rather than scrolling. The frames clip
    at the card edge with the sticky actions column pinned — closest honest
    rendering. Fix the page and I'll rebuild.

11. **The pager is below the fold at 1440×900 with 10 rows.** Ten rows put the
    footer at ~965px. That's why frames 04, 06 and 08 use short lists — they're
    the only ones where the new Per page control and the running count are
    actually visible on a laptop screen. Worth considering a shorter default
    page size, or a sticky footer.

12. **No accommodation-fares editor exists.** `DEFAULT_ROUTE_ACCOMMODATION_FARES`
    and `RoutesValue.accommodationFares` are data plumbing only — nothing
    renders tiers. Nothing to draw, so nothing was invented.

## Vessel type sub-line — the data still isn't wired

The Vessel column renders two lines: vessel name over its fleet type
(`Fast Craft`, `RoRo`, `Passenger Ship`) in `text-[11px] text-slate-400`.

**`Route.vessel` is still a free-text name.** The type lives on
`FleetVessel.type` in `schedule-steps/VesselStep.tsx` (`MOCK_FLEET`). Of the
seven vessel names in `MOCK_ROUTES`, only **FC Sinulog** and **MV Visayan Star**
exist in `MOCK_FLEET` — a name lookup would leave five of the ten visible rows
blank. Two ways out:

1. Store a `vesselId` on `Route` and resolve against the fleet (correct, needs a
   data migration), or
2. Add the missing hulls to `MOCK_FLEET` so the name lookup resolves.

This matters more now: `AssignVesselDialog` writes back `v.name` — a string —
so assigning a vessel through the new dialog can only ever produce the same
loose name reference the table then has to guess a type for.

Until then the plugin uses a `VESSEL_TYPE` map near the `R1.` marker — edit it
there, or point `vType()` at a real lookup once one exists.

## Shared-layer note

Everything above the `R1.` marker is shared with the Tickets plugin and was
verified byte-identical before this rebuild. Two deliberate divergences now
exist:

- **`GRID_COLS` is 4** (Tickets is still 3) — section layout only, no effect on
  the frames themselves.

- **`max-w-md` is 476px here, 448px in `buildFiltersDialog`.** `globals.css`
  sets `html { font-size: 17px }`, so Tailwind's rem-based `max-w-*` scales:
  `max-w-md` = 28rem = **476px**, and `max-w-3xl` = 48rem = **816px** (which the
  shared code already uses). The 448 in `buildFiltersDialog` is the 16px figure
  and is wrong. It was left alone so the shared layer stays identical to the
  Tickets plugin — **fix it in both files together**, then the Filters dialog
  will match the confirm dialogs.

If you change a token or the sidebar in the Tickets plugin, mirror it here.

## Tuning

Routes-specific data sits under the `R1.` marker in `code.js`:

- `ROUTE_ROWS` / `ROUTE_ROWS_P2` / `ROUTE_ROWS_ASC` — the seeded table rows,
  derived from `MOCK_ROUTES` with today's date filter and the descending
  schedule sort already applied.
- `ROUTE_FILTER_FIELDS` — the six filter fields.
- `FLEET` — `MOCK_FLEET` verbatim, all 15 hulls.
- `ROUTE_CANCEL_REASONS` — the narrowed route-level reason set.
- `PAGE_SIZE_OPTIONS` — the Per page choices.
- `routeMenuItems(status, isEnabled, hasConfirmed)` — the guards and tones;
  change the arguments in a builder to re-derive that frame's disabled states.
- `SECTION_NAME` — rename the target section.

The seed dates every leg relative to "today" and the frames hard-code
**Thursday, Aug 13 2026**. Re-derive `ROUTE_ROWS*` if you want the frames to
read as a different day.
