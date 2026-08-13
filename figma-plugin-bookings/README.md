# Tripket — Build "Bookings — All states"

The fourth Figma plugin in the set, after Tickets, Routes and Vessels. It builds
**40 frames** from `app/bookings/page.tsx` into a **brand-new section** it
creates itself — nothing already in the file is touched.

Rebuilt against the latest edits to `BookingStatusPicker` and the passenger
expansion strip — see **What changed** below.

## Install & run

1. Open **Tripket.ph** in the **Figma desktop app**.
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Pick `manifest.json` from **this** folder (`figma-plugin-bookings/`).
   It installs alongside the other three — different `id`, different entry.
4. Menu → **Plugins → Development → Tripket — Build Bookings Section**.

The plugin drops a new **"Bookings — All states"** section 400px clear of every
existing section, **4 frames per row** (matching Routes and Vessels; Tickets is
still on 3).

**Re-runs are additive.** The run reads the frame names already in the section
and skips every one it finds, so re-running adds only frame names that aren't
there yet and leaves everything else exactly where it is. To rebuild a single
frame, delete just that frame and run again.

⚠️ **One exception this time.** The detail dialog's footer button was labelled
`Edit` — it should read **`Edit booking`**, with a pencil glyph and a slate ring
that disappears when the booking has settled. That's fixed, but it lives inside
the five **Booking detail** frames, which already exist and will be skipped.
Delete `Booking detail / 01`–`05` before re-running if you want the corrected
label; otherwise only the new frames appear.

## About the seed data — read this first

The other three plugins copy a literal seed array. This one **can't**.
`deriveBookings()` generates bookings procedurally from whatever voyages are in
the store, seeded by a hash of each voyage id, so there is no fixed row set to
reproduce.

The rows here are built from the real vocabulary — `FIRST_NAMES` / `LAST_NAMES`,
the `first.last@example.com` contact pattern, `TKT-####` refs, the fleet, the
port pairs — and from the samples the generator explicitly forces:

| Counter | Guaranteed sample |
|---|---|
| 1 | Refunded booking |
| 2 | To Refund booking, awaiting payout |
| 4 | 3 pax, one removed by the customer |
| 17 | 4 pax with mixed ticket statuses (Issued · Issued · To Refund · Refunded) |

Everything else is **representative, not byte-exact**. Copy is verbatim; the
specific names, amounts and dates are not. Adjust `BOOKINGS` under the `B1.`
marker if you want the frames to match a particular store.

## What changed in this pass

| Area | Then | Now |
|---|---|---|
| Update-status menu | Four options, current status shown and greyed | Current status is **filtered out** — three options, plus an `UPDATE STATUS` eyebrow above them |
| Cancel booking row | Slate text, `Cancelled` slate chip | **Rose** text, and the chip reads **`For Refund`** in rose — naming where the booking actually lands |
| Passenger expansion | `grid-cols-2`: Ticket number · Valid ID / Birth date · Nationality | `grid-cols-6`: **Ticket number + Operator ticket** span 3 each, then Valid ID / Birth date / Nationality span 2 each |
| Operator ticket | — | New field, mono bold, `—` until the shipping line hands a number back |
| Valid ID Photos | not drawn | The `RequirementRow` list is now built — 40px thumbnail, two-line label, emerald `UPLOADED` / rose `MISSING` chip |

## The 40 frames

**Recent bookings (01–10)**

| # | Frame | State |
|---|---|---|
| 01 | View bookings — Loading | `TableSkeleton rows={8}` |
| 02 | View bookings — Default list | Booking date desc, `Showing 1–10 of 42 bookings` |
| 03 | Search name or ref — Results | Query `MNL`; search deliberately ignores the date filter |
| 04 | Filter — No results | `No bookings match your filters.` |
| 05 | Open filters — Dialog open | Origin · Destination · Vessel · Status · Booking date |
| 06 | Apply filters — Filters applied | Active-count badge on the Filters button |
| 07 | Sort by amount — Ascending | Arrow flipped on the Amount header only |
| 08 | Wide table — Scrolled right | `min-w-[1280px]` scrolled to its right edge |
| 09 | Rows per page — Selector open | 10 / 25 / 50 / 100 |
| 10 | No bookings yet — Empty state | `EmptyState kind="inbox"` |

**Row actions (01–05)** — four items, each with its own guard

| # | Frame | Menu |
|---|---|---|
| 01 | Under Review | View tickets · **Approve** (emerald) · Refund locked · Cancel locked |
| 02 | Confirmed | Approve locked · Refund locked · **Cancel booking** (rose) |
| 03 | Expired hold | Everything but View tickets locked — never paid, nothing to return |
| 04 | For Refund | **Refund** live · Cancel locked |
| 05 | Refunded | Only View tickets live |

**Booking ref (01)**

| # | Frame | State |
|---|---|---|
| 01 | Copy ref — Copied | Copy glyph swaps to an emerald check + toast |

**Approve (01–04)** — `ApproveBookingDialog`, rewritten

The operator no longer types Tripket's ticket numbers:

- Tripket's own number is **derived** (`ticketNoFor` → the ticket's number, or
  `TKT-0017-A` off the booking ref) and shown inline beside the passenger name.
- The only editable field per row is the **operator's** ticket number — and it's
  optional, as is the operator's booking reference at the top.
- Passenger and Vehicle tickets are now **collapsible sections**; the vehicle
  number moved out of the header into its own card.
- The per-ticket **Note** textarea is gone.
- `ready` is just `pending.length > 0`, so the CTA — now **Confirm**, not
  "Approve & issue" — is live as soon as there's anything to issue. **Nothing
  has to be typed.**

| # | Frame | State |
|---|---|---|
| 01 | Approve booking — Empty form | Nothing typed, and Confirm is still live |
| 02 | Ticket numbers entered — Ready to issue | Operator numbers filled in |
| 03 | All tickets settled — Nothing to issue | `All tickets in this booking are already settled.` |
| 04 | One passenger + one vehicle | Both sections open with exactly one entry each — everything fits without scrolling |

Frames 01–03 use a four-pax booking, which pushes the Vehicle section below the
fold. Frame 04 is a one-passenger booking so both sections and both entries read
in a single view. `paxCollapsed` / `vehCollapsed` are still available on the
builder if you want the collapsed states drawn.

Frame names 01–03 are unchanged so they rebuild in place — **delete
`Approve / 01` and `02` before re-running** to pick up the new layout.

**Refund (01–03)** — `RefundConfirmDialog`

| # | Frame | State |
|---|---|---|
| 01 | Mark Refunded — Remarks required | Empty textarea, confirm at `bg-brand-300` |
| 02 | Mark Refunded — Remarks entered | Payout reference typed, confirm live |
| 03 | Mark Refunded — Validation error | Rose ring + `Remarks are required before confirming.` |

**Cancel (01–03)** — the shared `CancelConfirmDialog`

| # | Frame | State |
|---|---|---|
| 01 | Cancel booking — Reason required | Placeholder, confirm locked |
| 02 | Choose reason — Menu open | **Four** reasons — Routes narrows the same component to three |
| 03 | Reason selected — Ready to cancel | `Duplicate booking` chosen |

**Booking detail (01–05)** — `BookingDetailDialog`, `max-w-5xl` + a 300px rail

| # | Frame | State |
|---|---|---|
| 01 | Under Review — Dialog open | Route card · Contact · Passenger table · Payment · Activity rail |
| 02 | Passenger row expanded | Ticket number · Operator ticket · valid ID · birth date · nationality · **Valid ID Photos** |
| 03 | Update status — Menu open (Under Review) | Approve · Refund · Cancel — only **Approve** is live |
| 04 | Confirmed booking — Dialog open | Same shell with the Confirmed pill |
| 05 | Update status — Menu open (Confirmed) | Mark as Paid · Refund · Cancel — only **Cancel booking** is live |

**Edit entity (01–07)** — `components/EditEntityDialog.tsx`, `max-w-lg`

One shared editor for a booking's passenger ticket *or* its vehicle. Mounted
with `layer="top"`, so it stacks over the still-open booking detail dialog —
the page never clears `openRef` when it sets `editTarget`. The frames show that
stack, with the black/40 scrim between them.

| # | Frame | State |
|---|---|---|
| 01 | Edit passenger — Dialog open | Save **disabled**: `dirty && valid && !locked`, and nothing is dirty yet |
| 02 | Edit passenger — Edited, ready to save | Save live at `bg-brand-500` |
| 03 | Edit passenger — Validation errors | Rose rings + messages under Last name and ID number |
| 04 | Edit passenger — Locked, settled booking | Amber banner, fields at `bg-slate-50`, Save locked |
| 05 | Edit vehicle — Dialog open | Indigo badge + `VEHICLE` tag; plate, class, make, model, year |
| 06 | Edit vehicle — Edited, ready to save | Save live |
| 07 | Edit vehicle — Locked, settled booking | Same banner, dashed upload zones greyed |
| 08 | Edit booking — Entity picker open | The `w-64` popover the footer button opens: a brand `PASSENGERS` group listing each editable ticket, then an indigo `VEHICLE` group |
| 09 | Edit booking — Locked on a settled booking | `canEditBooking()` false — the button greys out and loses its ring, so the picker can't open |

Frames 01–07 are what you get *after* choosing an entity from the picker in
frame 08. The picker is the only way into the editor from this page.

The two forms are deliberately distinct: passenger reads brand-orange with a
person glyph, vehicle indigo with a car glyph, each with its own tag pill.

## Things I found in the source you may want to know

Real behaviours in the current code, reproduced faithfully in the frames.
Several look like bugs — flagging rather than silently "fixing" them.

1. **The "Ticketholder" column shows an email, not a name.** `Booking.ticketholder`
   holds `"Maria Santos"`, but the cell renders `b.contactEmail`. The column is
   also sortable by `ticketholder` — so the sort key and the displayed value are
   different fields, and sorting the column appears to scramble it. Either
   rename the header or render the name.

2. **Two of the statuses in the table aren't `BookingStatus` values.** `Expired`
   (a Pending hold past `paymentExpiresAt`) and `Completed` (an approved booking
   whose voyage has sailed) are computed in the cell. Neither appears in the
   Filters dialog's Status list, so **there is no way to filter for an expired
   hold or a completed booking** even though both render as distinct chips.

3. **The status filter is also missing `Cancelled`.** The options are Pending,
   Confirmed, Under Review, For Refund and Refunded. `deriveBookings` no longer
   seeds Cancelled bookings, but the admin can create them, and then they can't
   be filtered for.

4. **`Refunded` and `Cancelled` share one tone**, `bg-slate-100 text-slate-500`
   — same as `Inactive`/`Retired` on the Vessels page. Money returned and a
   booking voided read identically at a glance.

5. **Searching silently drops the date filter.** When `query` is non-empty the
   filter returns `true` before the `bookingDate` range check ever runs. The
   comment says this is deliberate (an exact ref match outside the window should
   still resolve) — but nothing in the UI tells the operator their date filter
   stopped applying, and the Filters badge still counts it as active.

6. **Cancelling doesn't cancel — it marks For Refund.** The row item reads
   "Cancel booking" and the confirm dialog's default body says *"This marks the
   booking For Refund"*. There is no separate "Mark For Refund" action; Cancel
   is the only path into that state. The status picker's chip now says this out
   loud (rose `For Refund` rather than a slate `Cancelled`), which is a real
   improvement — but the **row menu still just says "Cancel booking"** with no
   such hint, so the two entry points into the same mutation still read
   differently.

7. **The status picker is almost always a one-option menu.** `canPick()` is
   strict enough that most states leave exactly one live choice: from **Under
   Review** only Approve; from **Confirmed** only Cancel booking; from **To
   Refund** only Refund; from **Refunded**, nothing at all. The dropdown renders
   three rows every time and greys two of them. Frames Booking detail 03 and 05
   show both ends of that.

8. **`Refunded` is unreachable except through `To Refund`.** `canPick` returns
   `current === "To Refund"` for it — and the only way into To Refund is the
   Cancel action. So a refund always requires cancelling first, even for a
   booking the operator just wants to refund outright.

9. **"Operator ticket" has no data behind it.** The new field renders a hard-coded
   `—` in `text-slate-300`; there is no `operatorTicketNumber` on `Ticket`, and
   nothing writes one. `ApproveBookingDialog` captures the Tripket ticket number
   only. The frames show it as the permanent placeholder it currently is.

10. **`View Passenger tickets` uses `window.location.href`.** Every other
   navigation on the page goes through the Next router. This one does a full
   page reload to `/tickets?booking=REF`.

11. **The row menu mixes `tone` and `danger`.** Approve passes `tone: "success"`,
   Cancel passes `danger: true`, and Refund passes neither — so Refund renders
   in the default slate even though it is the counterpart to Approve. `RowMenu`
   now supports `tone` for all of them.

12. **Every seeded booking carries a vehicle.** `deriveBookings` has
   `const hasVehicle = true;` with a comment saying to flip it back to
   `rand() < 0.35` "once real bookings flow in". So the no-vehicle branch of the
   detail dialog's meta row (which renders a `—`) is currently unreachable from
   seed data.

13. **Add-ons and the service fee are invented per booking.** `PaymentInformation`
    derives 0–3 add-on lines from an FNV-1a hash of the ref, with a note saying
    they "aren't captured per booking yet". The displayed breakdown is
    reconciled against the gateway's `subTotal`, so the vehicle line silently
    absorbs the rounding remainder.

14. **The detail dialog's body always overflows.** Its content runs to ~993px
    against a 630px scroll region at 1440×900 — the Payment Information section
    is entirely below the fold on open. The frames render the scrollbar to make
    that visible.

15. **The table needs a horizontal scroll at 1440.** Unlike the Routes table
    (which has no scroll container at all), this one does it properly:
    `overflow-x-auto` + `min-w-[1280px]` + `scrollbar-gutter: stable`, with the
    actions column pinned `sticky right-0`. Frame 08 shows it scrolled right —
    Amount and Booking date aren't reachable otherwise.

16. **The editor can't reach fare, amount, pax type or fare class.** That's
    deliberate — a comment says they drive payment totals and stay read-only —
    but it means a passenger booked into the wrong fare class can only be fixed
    by cancelling and rebooking.

17. **The entity picker offers refunded passengers as editable.** It filters out
    `status === "Cancelled"` and `removedByUser`, but **not** `To Refund` or
    `Refunded`. The button itself is gated on the *booking's* status, so on a
    still-open booking a refunded ticket is listed and opens a fully editable
    form. Frame Edit entity / 08 shows Sofia (For Refund) and Diego (Refunded)
    both in the list.

18. **A required ID photo blocks nothing.** `PhotoField` marks a missing
    required photo with a rose `Missing` chip and a rose dashed drop-zone, but
    `valid` is computed only from the text fields — so **Save changes stays
    enabled with both ID photos missing.** Frame Edit entity / 02 shows the back
    photo empty and Save live.

19. **Approve can now be confirmed with nothing filled in.** `ready` is only
    `pending.length > 0` — every field in the dialog is optional, so Confirm
    issues every pending ticket with no operator reference captured at all. The
    subtitle still reads *"Enter each passenger's ticket number to issue"*,
    which no longer describes what the form asks for.

20. **The two refund rows fall below the fold.** For Refund and Refunded are the
    two oldest bookings, and the default sort is booking date descending, so on
    a 900px screen they're off-screen. Row-action frames 04 and 05 apply the
    status filter to surface them — that's why those two frames look different.

## Shared-layer note

Everything above the `B1.` marker is the chassis shared with the Tickets, Routes
and Vessels plugins. This page is the one the shared **table primitives** were
originally written for — `CELL_PAD_X` (px-6), `CELL_PAD_Y` (py-4), `ROW_H`,
`THEAD_H`, `ACTIONS_W`, `layoutColumns`, `routeCell`, `copyableId`,
`departureW` and `buildStickyActions` all match it exactly and are reused
unchanged.

Two deviations, same as the other plugins:

- **`GRID_COLS` is 4** (Tickets is still 3).
- **`max-w-md` is 476px** in the bookings-only dialogs, the correct 17px-root
  figure. `buildFiltersDialog` in the chassis still uses 448 — that dialog *is*
  mounted by this page (frame 05), so this is the one plugin where the
  inconsistency is visible side by side. Fix it in the chassis and mirror into
  the Tickets plugin.

`buildToolbar` in the chassis renders a count sub-line under the h2. This page
dropped that sub-line (like Routes), so `buildBookingsToolbar` is a local
variant rather than a reuse.

## Tuning

Bookings-specific data sits under the `B1.` marker in `code.js`:

- `BOOKINGS` — the seeded table rows (see the caveat above).
- `BOOKINGS_SEARCH` / `BOOKINGS_REFUND` / `BOOKINGS_BY_AMOUNT` — the filtered
  and re-sorted variants the frames use.
- `B_TONE` / `T_TONE` — booking- and ticket-level status palettes, including the
  two computed states (`Expired`, `Completed`).
- `BOOKING_FILTER_FIELDS` — the five filter fields.
- `CANCEL_REASONS` — the full four-reason set.
- `DETAIL_TICKETS` / `ACTIVITY` / `APPROVE_PAX` — the dialog contents.
- `bookingMenuItems(status, expired)` — the row-menu guards.
- `SECTION_NAME` — rename the target section.
