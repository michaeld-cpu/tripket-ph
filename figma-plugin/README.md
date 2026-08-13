# Tripket — Build "Tickets- Passenger & Vehicles — All states"

A one-shot Figma plugin that builds 12 native frames inside section `5778:29129`
on your **Michael** page, translated directly from the project source —
no screenshots, no Puppeteer, no DOM capture.

## Install & run

1. Open **Tripket.ph** in the **Figma desktop app** (this won't work in the browser).
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Pick `manifest.json` from this folder.
4. Menu → **Plugins → Development → Tripket — Build Tickets Section**.

Already imported once? **You don't need to re-import** — Figma re-reads
`code.js` on every run.

### Runs are additive (v4)

The plugin reads the section's existing frame names first and only builds the
ones that aren't there. Frames already on the canvas are never touched, moved
or overwritten, so approved work is safe. Grid slots come from each builder's
fixed index, so existing frames keep their positions and new states fill in
after them.

To rebuild a single frame, delete it and run again — the plugin sees it
missing and re-creates just that one. It reports what it did:
`Added 20 frames · kept 13 existing`.

## v2 — fidelity pass

Everything below was wrong in v1 and is now taken verbatim from the source:

| Area | v1 | v2 |
|---|---|---|
| Sidebar icons | invented approximations | exact path data from `Sidebar.tsx` — `VoyageIcon` is the clock, `TicketIcon` the clipboard, `TicketsIcon` the perforated stub (with its `stroke-dasharray`), plus the real Passengers/Vehicles/Accounts/Audit/Settings geometry and per-icon stroke weights |
| Tripket mark | generic ferry glyph | the real `public/imgs/logo.png`, embedded and recoloured white to match `brightness-0 invert` on the brand-600 tile |
| Line switcher | orange "TP" tile, bordered | real `LogoTile` — white rounded-md tile, gray-200 ring, **2GO Travel** logo `object-contain` (lines[0] is what `ShippingLineContext` seeds), borderless trigger, gray-100 chevron box with the up/down glyph |
| Sidebar user block | circular avatar, name + "Administrator" | rounded-lg brand-100 tile, **role** then **email**, `mt-4 border-t pt-3` — as the component renders it |
| Active nav item | had a slate background | weight + colour + the 3px brand bar only, no fill (source has no active background) |
| Table columns | guessed fixed widths → Route cities collided, Class bled | measured from cell content like a browser's auto table layout |
| Line heights | 1.3–1.4 guesses | browser `leading-normal` (1.5), so row and card heights match |
| Route legs in dialogs | plain arrow icon | the dashed 48×12 connector from the source SVG |
| Activity rail | invented dot list | the real `ActivityLog` — tinted event nodes on a spine, white entry cards, actor avatars, relative timestamps |

## What it builds

Laid out 3 across × 4 down at 64px margin / 40px gutter — the same grid the
Authentication, Bookings and Vessels sections use.

**Passenger tickets** (`app/tickets/passengers/page.tsx`)

| # | Frame | State |
|---|---|---|
| 01 | View passenger tickets | Loading — `TableSkeleton rows={8}` |
| 02 | View passenger tickets | Empty — "No tickets yet" |
| 03 | View passenger tickets | Default list, 15 rows, pager 1 of 3 |
| 04 | Search ticket TKT-0004 | Results shown, query in the field |
| 05 | Open ticket actions | RowMenu open (disabled items shown greyed) |
| 06 | Open ticket detail | `TicketDetailDialog` — Issued ticket + activity rail |

**Vehicle tickets** (`app/tickets/vehicles/page.tsx`)

| # | Frame | State |
|---|---|---|
| 01 | View vehicle tickets | Loading |
| 02 | View vehicle tickets | Empty — "No vehicle tickets yet" |
| 03 | View vehicle tickets | Default list, 10 rows, pager 1 of 2 |
| 04 | Search plate ABC 1234 | Results shown |
| 05 | Open vehicle actions | RowMenu open — View booking / Edit vehicle / Cancel ticket / Refund |
| 06 | Open vehicle detail | `VehicleDetailDialog` |
| 07 | Cancel ticket | `CancelConfirmDialog` — on-open state, no reason picked |

### v3 — vehicle actions only

Tracks the update to `app/tickets/vehicles/page.tsx`. **Passenger frames are
untouched**; they keep their own five-item menu.

The vehicle row menu is now four items in source order, with the real guards
baked into the frame:

| Action | Enabled when |
|---|---|
| View booking | always |
| Edit vehicle | `canEditBooking` — Pending, Submitted or Confirmed |
| Cancel ticket | not To Refund, Refunded **or Submitted** — an unapproved booking has to be approved before it can be cancelled |
| Refund | only from To Refund |

Frame 05 is anchored on a **Confirmed** row (Patricia Lim, TKT-0009) because
that's the state where the menu reads most usefully: View, Edit and Cancel
live, Refund greyed. Change `idx` in that builder to anchor a different row —
the disabled states recompute from `VEH_ROWS[idx].st`.

Frame 07 is new: the `CancelConfirmDialog` in its on-open state — required
reason unset, so the destructive button sits disabled at `bg-rose-300` and the
dismiss reads "Keep ticket".

> The grid is now 3 × 5. Thirteen frames need 4,852px of section height, so the
> plugin grows the section from 4,200 on the first v3 run.

## v4 — 20 more states, both pages (33 total)

The 13 existing frames are left alone; these are appended after them.

**Passenger tickets 08–18**

| # | Frame | What it shows |
|---|---|---|
| 08 | Open ticket filters — Dialog open | `FiltersDialog`, all six fields: Route, Vessel, Status, Fare class, Passenger type, Booking date |
| 09 | Apply filters — Filtered list | Filters button carrying the active-count badge, table cut to the matching rows |
| 10 | Search unmatched ticket — No results | "No tickets match your filters." |
| 11 | Go to next page — Page 2 | Pager on page 2 of 3, Previous live |
| 12 | Copy ticket number — Copied feedback | Emerald check swapped for the copy glyph + the brand-600 toast pill |
| 13 | Mark Issued — Dialog open | `MarkPaidDialog` — ticket number + optional note, confirm disabled until a number is typed |
| 14 | Edit passenger — Dialog open | `EditEntityDialog` — brand accent, PASSENGER tag, two-column form, Valid-ID divider, photo fields |
| 15 | Preview valid ID — Lightbox open | `DocumentPreviewDialog` at black/75 |
| 16 | Update status — Picker menu open | The footer `StatusPicker` opening upward: Refund locked, Cancel ticket live |
| 17 | Row actions — Pending row | Mark Issued live, Refund locked |
| 18 | Row actions — For Refund row | Refund live, Cancel locked |

**Vehicle tickets 08–16**

| # | Frame | What it shows |
|---|---|---|
| 08 | Search unmatched plate — No results | "No vehicle tickets match your search." |
| 09 | Go to next page — Page 2 | Page 2 of 2, 8 rows |
| 10 | Copy ticket number — Copied feedback | Check + toast |
| 11 | Edit vehicle — Dialog open | `EditEntityDialog` — indigo accent, VEHICLE tag, OR/CR/photo fields |
| 12 | Cancel ticket — Reason selected | Reason picked, confirm live at `bg-rose-600` |
| 13 | Cancel ticket — Others — Free text | "Others" unlocks the textarea |
| 14 | Cancel ticket — Validation error | Blank "Others" after blur — rose border + error line |
| 15 | Row actions — For Refund row | Refund live, Cancel + Edit locked |
| 16 | Row actions — Under Review row | Cancel locked (Submitted must be approved first) |

Comped-fare and removed-by-customer rows aren't separate frames — they're
already visible as rows 6 and 5 of the default list.

### Fidelity fix carried in v4

`Modal.tsx` backdrops are **black/30** (black/40 for `layer="top"`), not
black/55, and Modal chrome is `border-gray-200` with its own heavier shadow.
The Vehicle detail and Cancel confirm frames were using the wrong scrim and
ring; both now use the real Modal shell. `TicketDetailDialog` keeps black/55
and the slate ring — it isn't a Modal, it rolls its own.

> 33 frames make the grid 3 × 11 — the section grows to ~10,500px tall.

Each frame carries the full app chrome: `Sidebar` (with the Tickets group
expanded and the correct leaf active), `Topbar`, `PageHeader` with the Export
button, the table card, and `Pagination`.

## How the measurements were derived

`app/globals.css` sets `html { font-size: 17px }`, so every Tailwind rem utility
is 17px-based — `w-60` is **255px**, `h-14` is **59.5px**, `p-5` is **21.25px**,
`px-8` is **34px**. The same file lifts every arbitrary `text-[Npx]` by ~1px
(`text-[12.5px]` renders at **13.5px**). Both rules are baked into the `SP` and
`FS` tables at the top of `code.js`, which is why the numbers are fractional —
and why they line up exactly with the existing Bookings frames (sidebar 255,
header 59.5, content inset 34 / 25.5).

Colors come from `tailwind.config.ts` (brand orange scale) and the status
palettes in `lib/bookings-data.ts` — `ticketStatusTone` / `ticketStatusLabel`
for passenger rows, `statusTone` / `statusLabel` for vehicle rows, including
the "To Refund" → **For Refund** and "Submitted" → **Under Review** relabels.

Icons are built with `createNodeFromSvg` from the exact path data in the source
components, so they stay editable vectors with the right stroke weights.

## Two things worth knowing

**Horizontal clipping is intentional.** The passenger table is
`min-w-[1280px]` inside a 1117px content column, so at a 1440 viewport the
Class and Amount columns really are scrolled off, with the frosted sticky
actions cell floating over the right edge. The frames reproduce that. If you'd
rather see every column at once, widen `CONTENT_W` or drop `PAX_TABLE_W` to
1117 in `code.js` and re-run.

**Layer naming differs from the older sections.** The Bookings/Vessels frames
came from a DOM import, so their inner layers are all named `Container` /
`Container:margin`. This plugin names layers semantically (`Row · TKT-0001-A`,
`Status pill`, `Actions column (sticky)`, `Button - Export`). Top-level frame
names still follow the file's `Area / View / NN — Action — State` convention.

## Tuning

Everything is data-driven near the top of `code.js`:

- `PAX_ROWS` / `VEH_ROWS` — the seeded table rows (shaped to match
  `deriveBookings`, using the real port codes and vessel names from
  `lib/routes-data.ts`).
- `NAV` — sidebar entries and order.
- `C`, `SP`, `FS`, `RAD` — the token tables.
- `BUILDERS` — the frame list; add or remove entries and the grid re-flows.
