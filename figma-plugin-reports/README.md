# Tripket — Build Reports Section

A Figma plugin that rebuilds `app/reports/page.tsx` as a native Figma frame.

**It builds one frame, because the route has one state.** The whole page is:

```tsx
export default function ReportsPage() {
  return <ComingSoon />;
}
```

No `PageHeader`, no toolbar, no table, no dialogs — 13 lines including the
comment block. Everything visible comes from `components/ComingSoon.tsx` with
its default props.

Sources transcribed:

| File | What comes from it |
| --- | --- |
| `app/reports/page.tsx` | the route: `<ComingSoon />` with no props |
| `components/ComingSoon.tsx` | the mark, the dashed-arc clock, both strings, the layout |
| `components/AppChrome.tsx` | `<main className="flex-1 overflow-y-auto px-8 py-6">` |
| `components/Sidebar.tsx` / `Topbar` | shared chrome (Reports is the active nav item) |

## Install

Figma → **Plugins → Development → Import plugin from manifest…** → pick
`figma-plugin-reports/manifest.json`. The plugin id is
`tripket-reports-allstates`, so it coexists with the routes / vessels /
bookings / tickets / shipping-lines plugins.

It creates (or reuses) a section named **`Reports — All states`** below every
existing section on the page. Like the others it is **additive**: if
`Reports / 01 — Coming Soon` already exists it is skipped, never replaced.
Delete that frame and re-run to refresh it.

## The frame

| # | Frame | State |
| --- | --- | --- |
| 01 | Reports / 01 — Coming Soon | the route as it ships: brand-50 mark, dashed-arc clock, `Coming Soon`, `This feature is coming soon. Stay tuned!` |

## Measurements

`globals.css` sets `html { font-size: 17px }`, so rem utilities are 17px-based:
`px-8` → 34, `py-6` → 25.5, `px-6` → 25.5, `py-16` → **68**, `mt-5` → 21.25,
`mt-1.5` → 6.375, `h-9` (the glyph) → 38.25.

The type-scale layer in `globals.css` bumps arbitrary `text-[Npx]` values by
~1px, but it does so via an **explicit list** — 9.5, 10, 10.5, 11, 11.5, 12,
12.5, 13, 13.5, 14, 15, 17. So:

- `text-[17px]` (the message) **is** on the list → renders at **18px**
- `text-[26px]` (the heading) is **not** on the list → renders at **26px**

Getting that wrong would have made the heading 27px. `h-[72px] w-[72px]` and
`min-h-[60vh]` are literal and don't scale either.

Resulting geometry: the `ComingSoon` block is 540 tall (`min-h-[60vh]` at
900vh), the centred item stack is 165.6 tall (72 + 21.25 + 39 + 6.375 + 27),
and it sits 272 from the top of the frame.

## Things I found in the source — flagged, not fixed

1. **The placeholder is not optically centred.** `min-h-[60vh]` is measured
   against the **viewport** (540px), but the scroll container is
   `<main>` — 840.5px tall after the 59.5px topbar, 789.5 after its own
   `py-6`. The block therefore centres inside 540 of an available 789.5 and
   lands about **125px above** the centre of the area the operator actually
   sees. `min-h-full` (or centring on the main area) would fix it.
2. **Reports is the only route with no page title.** Every other page renders
   `<PageHeader title="…" />`; this one renders `<ComingSoon />` alone, so the
   only thing telling you where you are is the sidebar highlight. Worth noting
   if the placeholder is going to live here for a while — a `PageHeader` above
   it would cost nothing and keeps the route consistent.
3. **`ComingSoon` takes `title` and `message` props that nothing uses.** Reports
   is its only call site and passes neither, so both defaults are hard-wired in
   practice. Not drawn as separate frames here — inventing placeholder copy
   would document an intent that isn't in the code.
4. **Tailwind's preflight `box-sizing: border-box` matters here.** `min-h-[60vh]`
   includes the `py-16` padding, so the grid's content box is 404, not 540. The
   frame reflects that; it's easy to get wrong by 68px if you assume
   content-box.

## The reporting module that used to be here

`app/reports/page.tsx` carries this note:

> The previous implementation (revenue/booking charts, per-route tables and the
> synthetic data behind them) lives in git history at 9177157 and can be
> restored wholesale when the real reporting requirements are settled.

That commit does exist and holds a **1,648-line** six-tab module — Overview,
Routes, Vessels, Voyages, Tickets, Bookings, with a KPI band, ranked bar
charts, sortable performance tables, a weekday-demand card and a cancellations
& refunds card. It is **deliberately not in this plugin**: these frames document
what ships. If the module comes back, that's a separate section to build against
whatever it looks like then, rather than against code that was pulled.

## Verification

`node --check` plus the stubbed-Figma smoke harness (`smoke-reports.js`) — no
reference errors, no NaN geometry, no frame overflow, 95 nodes. The layout was
also rendered from the built node tree to SVG and eyeballed.
