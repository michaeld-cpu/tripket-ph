# Tripket — Build Shipping Lines / Add line

A Figma plugin that rebuilds the **shipping-line switcher** and the
**"Add a shipping line" dialog** as native Figma frames — real text, real
vectors, real measurements. Nothing is a screenshot.

Sources transcribed:

| File | What comes from it |
| --- | --- |
| `components/CreateLineDialog.tsx` | the whole dialog — every field, label, placeholder, toggle and footer state |
| `components/ShippingLineSwitcher.tsx` | the topbar trigger, the `w-[360px]` dropdown, `LineRow`, `SuspendedChip`, the "Add Shipping Line" footer |
| `components/Modal.tsx` | shell — `max-w-lg`, `max-h-[90vh]`, `rounded-2xl`, `black/30` backdrop |
| `components/Select.tsx` | the `inline` option menu, including its up/down flip logic |
| `lib/shipping-lines.ts` | all 7 seed lines, in source order, with their real `fallbackTint` and `initial` |
| `lib/line-status.ts` | the suspended (`Disabled`) row treatment |
| `lib/settings-data.ts` | `PAYMENT_PROVIDERS` / `BOOKING_PROVIDERS` and their defaults |
| `app/page.tsx` + chart/list components | the Dashboard backdrop behind the scrim |

## Install

Figma → **Plugins → Development → Import plugin from manifest…** → pick
`figma-plugin-lines/manifest.json`. The plugin id is `tripket-lines-addline`,
so it installs alongside the routes / vessels / bookings / tickets plugins
without clobbering any of them.

Run it on any page. It creates (or reuses) a section named
**`Shipping lines — Add line`**, placed below every existing section on the page,
laid out **4 frames per row** at 1440×900.

## It is additive — it never replaces your work

Before building, the plugin reads the frame names already in the section and
**skips any name that exists**. It reports e.g.
`Added 3 frames to "Shipping lines — Add line" · kept 13 existing`.

So: to refresh a single frame, delete that one frame in Figma and re-run.
To rebuild everything, delete the whole section (or just its frames).

> **If you add a frame to `BUILDERS` later, append it at the END of the array.**
> Grid position is derived from the array index, so inserting in the middle
> shifts every later frame onto a slot that already has a frame in it.

## The 16 frames

**Switcher** — `ShippingLineSwitcher.tsx`

| # | Frame | State |
| --- | --- | --- |
| 01 | Topbar switcher — Rest | closed trigger; also the clean Dashboard backdrop |
| 02 | Dropdown open — All 7 lines | full seed list, 2GO active with the brand tick |
| 03 | Dropdown open — Search "fast" | `query` filter down to one row |
| 04 | Dropdown open — No matches | the `px-4 py-6` "No matches" state |
| 05 | Dropdown open — Disabled line | two suspended lines: 50% dimmed + `DISABLED` chip, still selectable |

**Add line** — `CreateLineDialog.tsx`

| # | Frame | State |
| --- | --- | --- |
| 01 | Empty form — Add line disabled | fresh open; `?` on the neutral tile; **Add line** at 50% |
| 02 | Name + code entered — Add line enabled | `Sunrise Ferries` / `SF123`; tile shows `SF` |
| 03 | Logo tile — Drag over | `bg-brand-50` + `ring-2 ring-brand-400` |
| 04 | Logo uploaded — Remove | image preview `object-cover`; "Remove" replaces "Drop or click" |
| 05 | Enable toggle off | switch grey, knob left, **and the sub-copy swaps** |
| 06 | Scrolled to Booking rules | body scrolled to its end; all three rules visible |
| 07 | Payment provider open — Flips up | menu opens **upward** (see below) |
| 08 | Booking provider open — Operator first | menu down; first option is the typed line name |
| 09 | Rules all on | all three switches brand |
| 10 | Submitting — "Adding…" | Add line at 50%, Cancel at 60% |
| 11 | Created — Switcher shows the new line | post-`setActiveId`, initials on the neutral tile |

## Measurements

`globals.css` sets `html { font-size: 17px }`, so every rem utility is
17px-based, not 16:

- `max-w-lg` → **544** (dialog width)
- `px-6` → 25.5 · `py-3.5` → 14.875 · `mt-5` → 21.25 · `gap-3` → 12.75
- `max-h-[78vh]` → **702** (the scrolling body) · `max-h-[90vh]` → 810 (the modal cap)

Literal px classes do **not** scale and are used verbatim: `w-[360px]`
(dropdown), `h-[68px] w-[68px]` (logo tile), `h-[22px] w-[38px]` +
`translate-x-[18px]` (switches), `140px` (the Line code grid column).

Computed dialog geometry: content **≈996px**, body clipped to **702**, footer
**67.8**, dialog **544 × 769.8**, centred at y ≈ 65. The body therefore scrolls
by ≈294px — frames 06, 08 and 09 sit at the bottom of that scroll, and the
overlay scrollbar thumb is drawn at its matching position.

## Two behaviours worth seeing in the frames

**The Select menu flips.** `Select.tsx` in `inline` mode measures room inside
the nearest scroll container and flips up when the menu doesn't fit below.
At scroll 0 the Payment provider trigger has 64px below it and 597px above, so
its 128px menu opens **upward over the Business address field** — frame 07.
Scrolled to the bottom, the Booking provider trigger has 279px below, so its
168px menu opens **downward over the Booking rules card** — frame 08.

**Paint order.** The menu is `z-30` in CSS. Figma has no z-index, so the
builder queues open menus and draws them after the rest of the body.

## Things I found in the source — flagged, not fixed

1. **The dialog's own subtitle is wrong.** It says *"Only the name is required —
   everything else is optional"*, but
   `const valid = trimmed.length > 0 && code.trim().length > 0` — **Line code is
   required too**, and both labels carry a red asterisk. Frame 01 shows the
   truthful result: name and code both empty, **Add line** dead.
2. **The required Line code is then thrown away.** `handleCreate` puts
   `code: code.trim()` on the `NewLine` payload, but `ShippingLineSwitcher`'s
   handler destructures `({ line, enabled, contact, settings })` — `code` is
   never read, never stored, never shown anywhere. The user is blocked on a
   field that has no effect.
3. **"Adding…" can never be seen.** `handleCreate` does
   `setSubmitting(true) → onCreate(...) → setSubmitting(false) → onClose()`
   synchronously in one tick, so React never paints the submitting state.
   Frame 10 draws it anyway, because it is what the code says the state looks
   like — if `onCreate` ever becomes async it will start appearing.
4. **The Booking provider value can go stale.** The option list is
   `[trimmed || "Operator", ...BOOKING_PROVIDERS]`, rebuilt on every keystroke.
   Pick the operator option, then edit the line name, and the stored value no
   longer matches any option — `Select` falls back to its italic grey
   placeholder ("Booking provider"), and the payload keeps the old string.
5. **Line code accepts nothing but `A–Z0-9`, silently.** The `onChange`
   uppercases, strips every other character and truncates to 8. Typing
   `sf-123!` yields `SF123` with no hint that anything was dropped — the
   placeholder `E.G. SF123` is the only clue.
6. **Two "required" markers, one validation message — and no message.** There is
   no inline error text anywhere; the only feedback for an incomplete form is
   the disabled button. Nothing tells the user *which* field is missing.
7. **`FALLBACK_TINT` is fixed at `bg-slate-500`** for every line created here,
   while the 7 seed lines each have their own tint. New lines are visually
   indistinguishable from each other in the switcher until a logo is uploaded.
8. **Enter submits from the name field only.** The `onKeyDown` handler lives on
   the Line name input; pressing Enter in the Line code field does nothing.

## Fidelity notes — where I did not transcribe literally

- **The Dashboard backdrop is representational.** The sidebar, topbar, page
  header, KPI strip (real labels, real chip styling) and the two chart-card
  headers with their real titles, date sub-lines and legends are transcribed.
  The **plots themselves are stand-ins**, and the Pending bookings card has its
  real header, chip, sub-line, "View all" button and column headers but **no
  rows** — the dashboard is not in this plugin's scope, and all of it sits under
  a 30% black scrim. KPI numbers are plausible, not derived from
  `fetchDashboardData()`.
- **The uploaded-logo preview in frame 04 reuses the embedded `2go.png`**, since
  the real value is a `FileReader` data URL that only exists at runtime.
- **Line statuses are invented for frame 05.** Status lives in
  `localStorage` (`tripket.line-status`) and every line defaults to `active`, so
  there is no "correct" set of suspended lines to transcribe. Starlite and
  Weesam were picked to show the treatment.
- **The camera hover overlay on the logo tile is not drawn** in any frame — it is
  `opacity-0` until `group-hover` / `group-focus-visible`, and none of these
  frames is a hover state.
- **`font-mono` on the Line code input** resolves to Roboto Mono / JetBrains
  Mono / Space Mono / Courier New, whichever your Figma has, and falls back to
  the body family if none is installed.

## Verification

`node --check` plus a stubbed-Figma smoke harness (`smoke-lines.js`) runs every
builder outside Figma and checks: reference errors, node counts, duplicate frame
names, `setRangeFills` / `setRangeFontName` range validity, dialog height against
the 810px `max-h-[90vh]` cap, frames overflowing 1440×900, and NaN geometry.
All 16 frames build clean. Layout was additionally eyeballed by rendering the
built node tree to SVG (`render-lines.js`), which is how the paint-order bug on
the open Select menus was caught.
