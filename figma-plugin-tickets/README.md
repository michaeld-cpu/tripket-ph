# Tripket — Build "Tickets — All states (v2)"

The fifth Figma plugin in the set. It builds **43 frames** covering **both**
ticket sub-pages:

- `app/tickets/passengers/page.tsx` → Passenger tickets
- `app/tickets/vehicles/page.tsx` → Vehicle tickets

(`/tickets` itself is only a `redirect("/tickets/passengers")`.)

## Why this exists alongside `figma-plugin/`

The original `figma-plugin/` also covers both sub-pages, but:

| | `figma-plugin/` | `figma-plugin-tickets/` |
|---|---|---|
| Built against | the pages as of Aug 12 | current source |
| Target section | writes into the imported **"Tickets- Passenger…"** section | **creates its own** "Tickets — All states (v2)" |
| Section grid | 3 frames per row | 4, matching Routes / Vessels / Bookings |
| Plugin id | `tripket-tickets-allstates` | `tripket-tickets-allstates-v2` |
| Frames | 33, no per-page pager control, no Operator ticket field | 43, current |

Different `id`, so both can be installed at once and the old section is never
touched. Once you're happy with v2, `figma-plugin/` can go.

## Install & run

1. Open **Tripket.ph** in the **Figma desktop app**.
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Pick `manifest.json` from **this** folder (`figma-plugin-tickets/`).
4. Menu → **Plugins → Development → Tripket — Build Tickets Section (v2)**.

Drops a new **"Tickets — All states (v2)"** section 400px clear of everything
else.

**Re-runs are additive.** The run reads the frame names already in the section
and skips every one it finds, so re-running after this update adds only the ten
new **Edit entity** and **Cancel passenger ticket** frames and leaves the other
33 exactly where they are — it reports `Added 10 frames · kept 33 existing`.
To rebuild one frame, delete just that frame and run again.

## About the seed data

Like the Bookings plugin — and unlike Routes and Vessels — these rows are
**representative, not byte-exact**. Both sub-pages flatten whatever
`deriveBookings()` produced, which is generated procedurally from the voyages
store. The vocabulary (`FIRST_NAMES` / `LAST_NAMES`, `TKT-####` refs, the fleet,
the port pairs, the fare classes, the vehicle makes) is real; the specific rows
are not. Adjust `PAX_TICKETS` / `VEHICLE_TICKETS` under the `T1.` marker.

## The 43 frames

**Passenger tickets (01–10)**

| # | Frame | State |
|---|---|---|
| 01 | View tickets — Loading | `TableSkeleton rows={8}` |
| 02 | No tickets yet — Empty state | `EmptyState kind="inbox"` |
| 03 | View tickets — Default list | Page size **15**, `Showing 1–15 of 96 tickets` |
| 04 | Search ticket or booking — Results | Query `TKT-0017`; search skips the date window |
| 05 | Filter — No results | `No tickets match your filters.` |
| 06 | Open ticket filters — Dialog open | Route · Vessel · Status · Fare class · Passenger type · Booking date |
| 07 | Apply filters — Filters applied | Active-count badge |
| 08 | Copy ticket number — Copied | Emerald check + toast |
| 09 | Rows per page — Selector open | 10 / 25 / 50 / 100 |
| 10 | Wide table — Scrolled right | `min-w-[1280px]` scrolled to its right edge |

**Passenger actions (01–04)** — five items, each with its own guard

| # | Frame | Menu |
|---|---|---|
| 01 | Issued ticket | Mark Issued locked (already Issued) · Refund locked · **Cancel ticket** live |
| 02 | Pending ticket | **Mark Issued** live · Refund locked · **Cancel ticket** live |
| 03 | For Refund ticket | Edit locked · Mark Issued live · **Refund** live · Cancel locked |
| 04 | Refunded ticket | Only **View booking** live |

**Mark Issued (01–02)** — `MarkPaidDialog`, `max-w-sm`

| # | Frame | State |
|---|---|---|
| 01 | Empty form — Confirm disabled | Ticket number empty, CTA at `opacity-60` |
| 02 | Ticket number entered — Ready | Number + note filled, CTA live |

**Ticket detail (01–03)** — `TicketDetailDialog`, `max-w-2xl`

| # | Frame | State |
|---|---|---|
| 01 | Issued ticket — Dialog open | Route card · Passenger card · Valid ID Photos · Payment |
| 02 | Pending ticket — No number, no ETD | `No ticket number yet`; the ETD caption renders only while Issued |
| 03 | Update status — Menu open | Refund locked from Issued; **Cancel ticket** live |

**Vehicle tickets (01–06)**

| # | Frame | State |
|---|---|---|
| 01 | View vehicle tickets — Loading | `TableSkeleton rows={8}` |
| 02 | No vehicle tickets yet — Empty state | `EmptyState kind="inbox"` |
| 03 | View vehicle tickets — Default list | `min-w-[1120px]`, page size 10 |
| 04 | Search ticket or plate — Results | Query `Pickup` |
| 05 | Search — No results | `No vehicle tickets match your search.` |
| 06 | Rows per page — Selector open | 10 / 25 / 50 / 100 |

**Vehicle actions (01–03)** — four items, gated on the parent booking's status

| # | Frame | Menu |
|---|---|---|
| 01 | Confirmed | Edit vehicle live · **Cancel ticket** live · Refund locked |
| 02 | Under Review | Cancel locked — an unapproved booking must be approved first |
| 03 | For Refund | Edit locked · Cancel locked · **Refund** live |

**Vehicle detail (01–02)** — `VehicleDetailDialog`, `max-w-xl`

| # | Frame | State |
|---|---|---|
| 01 | Confirmed — Dialog open | Route card · Vehicle grid · Valid ID Photos (OR / CR / Vehicle photo) |
| 02 | Update status — Menu open | **Two** options only — no "Mark Issued" here |

**Cancel ticket (01–03)** — the shared `CancelConfirmDialog` with `noun="ticket"`

| # | Frame | State |
|---|---|---|
| 01 | Reason required | Placeholder; **Keep ticket** / **Cancel ticket** |
| 02 | Choose reason — Menu open | All four reasons (the booking-level set) |
| 03 | Reason selected — Ready to cancel | `Bad weather / port closure` |

**Edit entity (01–07)** — `components/EditEntityDialog.tsx`, `max-w-lg`

The same editor the Bookings page uses, mounted from each sub-page's row menu.
Opened from the row menu rather than a detail dialog, so nothing sits behind it
here.

| # | Frame | State |
|---|---|---|
| 01 | Edit passenger — Dialog open | Save **disabled**: `dirty && valid && !locked`, nothing dirty yet |
| 02 | Edit passenger — Edited, ready to save | Save live at `bg-brand-500` |
| 03 | Edit passenger — Validation errors | Rose rings under Last name and ID number |
| 04 | Edit passenger — Locked, settled booking | Amber banner, fields at `bg-slate-50` |
| 05 | Edit vehicle — Dialog open | Indigo badge + `VEHICLE` tag; plate, class, make, model, year |
| 06 | Edit vehicle — Edited, ready to save | Save live |
| 07 | Edit vehicle — Locked, settled booking | Dashed upload zones greyed |

**Cancel passenger ticket (04–06)** — current vs proposed

The vehicle sub-page routes Cancel through `CancelConfirmDialog` and captures a
reason. **The passenger sub-page does not** — its row item mutates straight to
`To Refund` and toasts. These three frames document both:

| # | Frame | State |
|---|---|---|
| 04 | Passenger ticket — Today, no dialog | What the code does now: menu → instant mutation → toast |
| 05 | Passenger ticket — Reason required *(proposed)* | The same dialog the vehicle page uses, `noun="ticket"` |
| 06 | Passenger ticket — Reason selected *(proposed)* | Confirm live |

Frames 05–06 are **not wired yet** — they're the design for parity. Wiring them
is the same shape as the vehicle page: hold the target ticket in state, mount
`<CancelConfirmDialog targetRef={…} noun="ticket" onConfirm={(reason) => …} />`,
and pass the reason into the activity entry instead of mutating inline.

## The Valid ID Photos rows

Both detail dialogs render the same anatomy — a **40px thumbnail**, a two-line
label (document name over a muted `REQUIRED` caption), and a status chip pushed
to the right edge — but the two components differ in details that are
reproduced rather than smoothed over:

| | `TicketRequirementRow` (passenger) | `VehicleDocRow` (vehicle) |
|---|---|---|
| Row | `flex justify-between gap-2.5`, no padding | `gap-3 rounded-lg px-1 py-1.5` |
| Label | 12.5px `font-medium` | 13px `font-semibold` |
| Empty thumb | `bg-slate-50` + **dashed** ring | `bg-slate-100` + solid ring |
| Missing chip | rose `Missing` (or slate `Not provided` when optional) | slate `Missing`, never rose |

The live rows show the uploaded photo itself and open a lightbox on click. The
plugin has no access to those mock URLs, so an uploaded slot is drawn as a
filled tile carrying the same photo glyph the component falls back to — the
layout, ring, chip and spacing are exact.

## Things I found in the source you may want to know

Real behaviours in the current code, reproduced faithfully in the frames.
Several look like bugs — flagging rather than silently "fixing" them.

1. **The passenger table's sort headers don't sort.** `Passenger` and
   `Departure` render a `SortIcon` inside a `<button>` — with no `onClick`, no
   sort state, and no comparator. The Bookings page has a real `SortHeader`
   with `handleSort`; this page has the affordance without the behaviour.

2. **The detail dialog's status pill shows the raw value, the table shows the
   label.** The table renders `ticketStatusLabel[r.status]`, so a `To Refund`
   ticket reads **FOR REFUND**. The dialog header renders `{ticket.status}`
   directly, so the same ticket reads **TO REFUND**. One of the two is wrong.

3. **The vehicle detail dialog's heading is an email.** `<h2>` renders
   `row.email`, while the vehicle table's own "Ticketholder" column renders
   `row.ticketholder` (the name). The same record reads two different ways
   depending on where you look — the same mismatch the Bookings table has.

4. **The vehicle page has no filters at all.** Just a search box — no
   `FiltersButton`, no `FiltersDialog`, no status/route/vessel filter. The
   passenger page has six filter fields. There's no way to list only the
   For Refund vehicle tickets.

5. **Cancelling a vehicle ticket cancels the whole booking.** A booking carries
   at most one vehicle, so `handleCancel` flips the booking to `To Refund` and
   sweeps *every* ticket on it — including all the passenger tickets — into
   `To Refund` too. The dialog says "Cancel ticket ‘REF’?" and gives no hint
   that the passengers go with it.

6. **Refunding a passenger ticket has no confirmation.** The row menu's
   `Refund` calls `mutateTicket(..., { status: "Refunded" })` inline and toasts.
   Money leaving the platform is gated behind a remarks dialog on the Bookings
   page but is one click here. Same for `Cancel ticket` on the passenger page —
   it mutates immediately, while the *vehicle* page routes through
   `CancelConfirmDialog` and captures a reason.

7. **So the same action is gated differently on the two sub-pages.** Cancel on
   passengers: instant, no reason captured. Cancel on vehicles: reason dialog.
   Both write to the same activity trail — so the log ends up with some
   cancellations carrying a reason and some not, depending only on which page
   the admin happened to be on. Frames Cancel ticket 04–06 show both.

8. **`Mark Issued` is reachable on a `To Refund` ticket.** The guard is
   `status === "Cancelled" || "Refunded" || "Issued"` — `To Refund` isn't in it,
   so a ticket queued for refund can be re-issued, which un-queues nothing.
   Frame Passenger actions / 03 shows it live.

9. **"Operator ticket" has no data behind it** — on both sub-pages. The
   passenger dialog's Passenger card and the vehicle dialog's Vehicle card each
   render a hard-coded `—` in `text-slate-300`. There is no field on `Ticket`
   or `Vehicle`, and nothing writes one.

10. **`void statusLabel;`** sits at module scope in the passenger page purely to
    keep an unused import alive. Either use it (see finding 2) or drop it.

11. **Page size is 15 on passengers, 10 on vehicles.** Fifteen rows at 75px put
    the passenger footer roughly 400px below the 900px fold, so the running
    count and the new Per page control are never visible on a laptop without
    scrolling. That's why frame 09 uses the searched short list.

12. **Both tables need a horizontal scroll at 1440.** `min-w-[1280px]` and
    `min-w-[1120px]` against a 1117px content column, both with
    `scrollbar-gutter: stable` and a pinned `sticky right-0` actions column.
    Frame Passenger tickets / 10 shows the right edge.

13. **A required ID photo blocks nothing in the editor.** `PhotoField` marks a
    missing required photo with a rose `Missing` chip and a rose dashed
    drop-zone, but `valid` is computed only from the text fields — so **Save
    changes stays enabled with an ID photo missing.** Frame Edit entity / 02
    shows it.

14. **The editor can't reach fare, amount, pax type or fare class.** Deliberate
    (they drive payment totals), but a passenger booked into the wrong fare
    class can only be fixed by cancelling and rebooking.

15. **A comped seat shows a chip, not ₱0.** A seat covered by the vehicle fare
    renders a sky `COMPED` chip with a ferry glyph. Worth knowing that the
    Amount column is not always a number.

## Shared-layer note

Everything above the `T1.` marker is the chassis shared with Routes, Vessels and
Bookings. Both sub-page tables are px-6 / py-4 / thead py-3 with a sticky
actions column, so `CELL_PAD_X`, `CELL_PAD_Y`, `ROW_H`, `THEAD_H`, `ACTIONS_W`,
`layoutColumns`, `routeCell`, `copyableId`, `departureW` and
`buildStickyActions` are reused unchanged.

Deviations, same as the other plugins:

- **`GRID_COLS` is 4** (the original `figma-plugin/` is still 3).
- **`max-w-md` is 476px** in the tickets-only dialogs, the correct 17px-root
  figure; `buildFiltersDialog` in the chassis still uses 448. That dialog *is*
  mounted here (frame 06), so the inconsistency is visible.

`buildToolbar` in the chassis renders a count sub-line under the h2; neither
sub-page has one, so `buildTicketsToolbar` is a local variant. It also takes a
`withFilters` flag, since the vehicle page has no Filters button.

## Tuning

Tickets-specific data sits under the `T1.` marker in `code.js`:

- `PAX_TICKETS` / `VEHICLE_TICKETS` — the seeded rows for each sub-page.
- `PAX_SEARCH` / `PAX_SHORT` / `VEH_SEARCH` — the filtered variants.
- `T_TONE` — the per-ticket palette (passenger table).
- `B_TONE` — the booking palette, which the **vehicle** table uses, since a
  vehicle ticket's status *is* its booking's status.
- `PAX_FILTER_FIELDS` — the six passenger filter fields.
- `CANCEL_REASONS` — the full four-reason set.
- `paxMenuItems(status, editable)` / `vehMenuItems(status)` — the row-menu guards.
- `paxStatusMenuOptions(current)` — the detail dialog's status picker, derived
  from a transcribed `canPick()`.
- `SECTION_NAME` — rename the target section.
