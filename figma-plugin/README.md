# Tripket — Build "Tickets- Passenger & Vehicles — All states"

A one-shot Figma plugin that builds 12 native frames inside the empty section
`5778:29129` on your **Michael** page, translated directly from the project source —
no screenshots, no Puppeteer, no DOM capture.

## Install & run

1. Open **Tripket.ph** in the **Figma desktop app** (this won't work in the browser).
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Pick `manifest.json` from this folder.
4. Menu → **Plugins → Development → Tripket — Build Tickets Section**.

It runs for a few seconds, then selects and zooms to the 12 new frames.
Safe to re-run — each run appends a fresh set, so delete the previous batch first
if you're iterating.

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
| 05 | Open vehicle actions | RowMenu open (View booking / Edit vehicle) |
| 06 | Open vehicle detail | `VehicleDetailDialog` |

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
