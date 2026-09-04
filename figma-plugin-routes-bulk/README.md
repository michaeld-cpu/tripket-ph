# Tripket — Build Routes Bulk Actions & Cancel Validation

A Figma plugin covering **two changes only**. It does not rebuild the Routes
section — filters, row menu, the create-route wizard and the refund flow all
stay in `tripket-routes-allstates`.

1. **Bulk actions** on `app/routes/page.tsx` — row and header select
   checkboxes, the selection banner that replaces `<thead>`, the "Disable
   routes" button that displaces Filters, and `BulkDisableRoutesDialog`.
2. **Cancellation reason validation** in `components/CancelConfirmDialog.tsx` —
   the new `REASON_MIN` / `REASON_MAX` bounds, the character counter, and its
   three colour tiers.

## What changed

### 1. Bulk actions (new)

| Before | Now |
| --- | --- |
| No selection affordance | A **17px `SelectCheckbox`** (`rounded-[5px]`) leads every row and the header — brand-500 when checked, slate-300 outline when not |
| — | The header box goes **indeterminate** (a dash, not a check) when only some rows on the page are picked |
| Filters sat in the toolbar unconditionally | With a selection live, Filters is **replaced** by **"Disable routes"** — rose-300 border, rose-600 label, and a rose-500 count badge |
| — | A **selection banner** (brand-50/60, brand-100 bottom border) sits between toolbar and table with the select-all box, "N routes selected", and **Clear selection** |
| — | `<thead>` is **hidden** while the banner is up — the banner already carries the select-all control, so keeping both would duplicate it |
| — | Selected rows fill **brand-50/50** and keep the 3px brand-500 accent bar **pinned** instead of revealing it on hover |
| — | **`BulkDisableRoutesDialog`** (`max-w-lg`) confirms the action |

Two behaviours worth drawing attention to, both from `bulkDisable()`:

- Legs with confirmed bookings are **skipped**, not disabled — the single-route
  action already refuses those and a bulk path shouldn't be a way around the
  guard. The toast reports the split: `2 routes disabled · 2 skipped (confirmed bookings)`.
- When nothing is eligible the toast is a full sentence rather than a count:
  `No routes disabled — the selected legs have confirmed bookings or are already disabled.`

The dialog summarises **the filters the selection was made under** rather than
listing every route, because a bulk action can span dozens of rows and "which
filters produced this set" is what an operator needs to verify. Selection is
also dropped whenever the visible set changes, so a filter change can't leave
invisible rows queued.

### 2. Cancel reason validation (changed)

`CancelConfirmDialog` already required a reason; what's new is the bound on the
free-text "Others" branch.

| Before | Now |
| --- | --- |
| Any non-empty free text passed | Must reach **`REASON_MIN` = 10** characters before **Mark Cancelled** enables |
| No upper bound | **`REASON_MAX` = 200**, enforced by `maxLength` — the field **refuses keystrokes** rather than rejecting on submit |
| One error string: "Enter the reason before confirming." | Adds **"Use at least 10 characters."** for the under-floor case |
| No counter | A **`{n} / 200` counter** shares one row with the validation message — message left, count right, on a single baseline instead of stacking |
| — | Counter has **three tiers**: slate-400 normally, **amber-600** inside the last 30 characters, **rose-500 medium** once the cap is hit |
| — | Textarea border turns **rose-300** when touched-but-empty *or* under the floor |
| Placeholder: "Describe the reason…" | **"Describe the reason (at least 10 characters)…"** |

`REASON_MIN` / `REASON_MAX` are exported from `CancelConfirmDialog.tsx` and
shared by every surface that captures a free-text reason, so the rule can't
drift between routes, bookings and tickets.

Sources: `app/routes/page.tsx` (`SelectCheckbox`, `selected`/`toggleOne`/
`toggleAllOnPage`, `bulkDisable`, the toolbar swap at the `selectedOnPage.length > 0`
branch), `components/BulkDisableRoutesDialog.tsx`, and
`components/CancelConfirmDialog.tsx`.

## Install

Figma → **Plugins → Development → Import plugin from manifest…** → pick
`figma-plugin-routes-bulk/manifest.json`. Plugin id `tripket-routes-bulk-cancel`
— distinct from `tripket-routes-allstates`, so both can be installed at once.

Creates (or reuses) a section named
**`Routes · Bulk actions & Cancel validation — All states`**, **4 frames per
row** at 1440×900. **Additive** — a frame whose name already exists is skipped,
never replaced, so re-running after an edit only fills in what's missing.

> The existing `Routes — All states (v3)` frames are untouched. Its cancel-reason
> frames now show the **pre-validation** dialog — worth deleting those so the
> file doesn't carry two versions of the same screen.

## The 13 frames

| # | Frame | State |
| --- | --- | --- |
| 01 | Bulk actions / 01 — No selection | baseline: `<thead>` visible with its select-all box, Filters in the toolbar |
| 02 | Bulk actions / 02 — 1 selected | one row checked, banner up, thead hidden, accent bar pinned |
| 03 | Bulk actions / 03 — 4 selected | header box **indeterminate** (dash) |
| 04 | Bulk actions / 04 — Select all on page | header box **checked**, all 10 rows checked |
| 05 | Bulk actions / 05 — Confirm dialog | `BulkDisableRoutesDialog`, count 4, filter summary |
| 06 | Bulk actions / 06 — Applied with skips | toast reporting the disabled/skipped split; selection cleared |
| 07 | Bulk actions / 07 — Nothing eligible | the full-sentence toast |
| 08 | Cancel validation / 01 — Required error | no reason picked, "Select a cancellation reason before confirming." |
| 09 | Cancel validation / 02 — Empty free text | Others chosen, nothing typed, no counter yet |
| 10 | Cancel validation / 03 — Below minimum | `6 / 200`, "Use at least 10 characters.", rose-300 border |
| 11 | Cancel validation / 04 — Valid | `51 / 200` slate, no message, **Mark Cancelled** enabled |
| 12 | Cancel validation / 05 — Approaching limit | `178 / 200` **amber-600** |
| 13 | Cancel validation / 06 — Cap reached | `200 / 200` **rose-500**, text cut mid-word the way `maxLength` truncates |

## Measurements

`globals.css` sets `html { font-size: 17px }`, so rem utilities are 17px-based:
`px-5` → 21.25, `py-2.5` → 10.625, `py-3.5` → 14.875, `gap-3` → 12.75,
`px-3.5` → 14.875, `max-w-lg` → 544, `max-w-md` → 476.

Literal px classes do **not** scale: the `h-4 w-4` checkbox is **17**,
`rounded-[5px]` stays **5**, the `h-2.5 w-2.5` glyph is **10.625**,
`min-w-[20px]` on the count badge stays **20**, and the 3px accent bar stays 3.

`globals.css` also lifts every `text-[Npx]` by roughly 1px; the `FS` table
encodes that already — `text-[13px]` → **14**, `text-[11px]` → **12**,
`text-[11.5px]` → **12.5**, `text-[13.5px]` → **14.5**, `text-[14px]` → **15**,
`text-[17px]` → **18**.

Derived heights:

| Element | Height |
| --- | --- |
| Selection banner | `py-2.5` ×2 + max(17, 21) = **42.25** |
| Select column | `px-5` ×2 + 17 = **59.5** (the `w-10` th is overridden by its own padding) |
| "Disable routes" button | `py-2` ×2 + 21 = **38** |
| Count badge | `h-5` = **21.25**, min-width 20 |
| Bulk dialog | header + summary + note + footer, hugging content |

## Verification

`code.js` is exercised against a stubbed Plugin API before shipping — all 13
builders run, and 25 assertions cover the banner copy, checkbox tri-state, the
toolbar swap, both toast strings, every validator message, and the three
counter colours. Lines 1–1538 (tokens, sidebar, topbar, table stack) are copied
byte-for-byte from `figma-plugin-routes/code.js`; new code starts at the "B1."
marker.
