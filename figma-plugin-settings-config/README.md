# Tripket — Build Settings / Configurations

A Figma plugin covering **only the Configurations tab** of
`app/settings/page.tsx`, after its UX rework. The Account and System tabs stay
in `tripket-settings-allstates` — this plugin does not touch them.

## What changed in the rework

| Before | Now |
| --- | --- |
| No per-row enable control | Every editor leads with a **44px Status column** — `RowStatusToggle`, an **emerald** switch with a check glyph inside the knob |
| Free-text rows only | Vehicle + Passenger rows carry a **Class `<Select>`** bound to fixed vocabularies (`VEHICLE_CLASS_OPTIONS`, `PASSENGER_CLASS_OPTIONS`) |
| Accommodations was a dashed "coming soon" placeholder | A **real editor** backed by `catalog.accommodations` — Status · Name · Capacity · Base fare |
| "Vehicle classes" | **"Vehicle types"** (rail label, card title, empty-state copy — the section id is still `vehicle-classes`) |
| Vehicle columns: Label · Descriptor · Max (kg / m) · Slots · Default fare · Companions | Vehicle columns: **Status · Class · Name · Capacity in vessel · Free pax · Fare** |
| Passenger columns: Category · Discount · Required document | Passenger columns: **Status · Class · Name · Discount** |
| Add-on columns: Name · Descriptor · Default price | Add-on columns: **Status · Name · Default price** |

Sources: `app/settings/page.tsx` (lines 179–773) and `lib/settings-data.ts`
(`DEFAULT_VEHICLE_CLASSES`, `DEFAULT_PASSENGER_TYPES`, `DEFAULT_ACCOMMODATIONS`,
`DEFAULT_ADD_ONS`, `PASSENGER_CLASS_OPTIONS`, `VEHICLE_CLASS_OPTIONS`), plus
`components/SaveBar.tsx` and `components/Select.tsx`.

## Install

Figma → **Plugins → Development → Import plugin from manifest…** → pick
`figma-plugin-settings-config/manifest.json`. Plugin id
`tripket-settings-configurations` — distinct from the full Settings plugin, so
both can be installed at once.

Creates (or reuses) a section named **`Settings · Configurations — All states`**,
**4 frames per row** at 1440×900. **Additive** — a frame whose name already
exists is skipped, never replaced.

> Because this is a separate section, your existing `Settings — All states`
> frames are untouched. Its Configurations frames (01–08 there) now show the
> **old** flow — worth deleting those eight so the file doesn't carry two
> versions of the same screens.

## The 12 frames

| # | Frame | State |
| --- | --- | --- |
| 01 | Passenger types — Seeded | first load: 4 fare categories, **every Class unset** |
| 02 | Vehicle types — Seeded | first load: 6 types, **every Class unset** |
| 03 | Accommodations | the new editor — Economy / Tourist / Business |
| 04 | Add-ons | 4 extras with Status + price |
| 05 | Passenger class select open | the inline menu, all 7 options |
| 06 | Vehicle class select open | the inline menu, all 6 options |
| 07 | Passenger types — Classes assigned, one row off | Student disabled (slate switch) |
| 08 | Vehicle types — Classes assigned, one row off | Light Truck disabled |
| 09 | Discount unit — Flat ₱ | the ₱/% segmented control flipped |
| 10 | Blank label — Save disabled | rose dot, "Every catalog row needs a label" |
| 11 | Empty catalog — Accommodations | "No accommodations. Add one to make it available to vessels." |
| 12 | Empty catalog — Vehicle types | the reworded empty state ("vehicle types", not "classes") |

## Measurements

`html { font-size: 17px }`: `p-6` → 25.5, `py-2` → 8.5, `px-2.5` → 10.625,
`w-52` (rail) → 221, `gap-2` → 8.5. Literal px classes don't scale — the **44px**
Status track, the 170 / 180 / 120 / 140 / 100 / 36px tracks, `h-9` on the
discount control, and `h-[22px] w-[38px]` with `translate-x-[18px]` on the
switch.

Grid templates resolved the way the browser does (subtract fixed tracks and
gaps, split the rest by `fr` weight), against an 815.25px card interior:

| Editor | Template |
| --- | --- |
| Vehicle types | `[44px 170px 1.4fr 120px 100px 120px 36px]` |
| Passenger types | `[44px 180px 1.4fr 170px 36px]` |
| Accommodations | `[44px 1fr 140px 140px 36px]` |
| Add-ons | `[44px 1fr 140px 36px]` |

The Vehicle header is the only two-line one (`Capacity<br />in vessel`,
`leading-tight`), so that strip is taller than the other three.

## Things I found in the source — flagged, not fixed

1. **Every seeded row ships with an empty Class.** Neither
   `DEFAULT_VEHICLE_CLASSES` nor `DEFAULT_PASSENGER_TYPES` sets `classKey`, and
   the editors render `<Select value={c.classKey ?? ""} placeholder="Select">`.
   So a brand-new line opens with **all 6 vehicle rows and all 4 passenger rows
   showing the italic grey "Select"** — ten rows that read as unconfigured — and
   nothing stops them being saved that way. Frames 01 and 02 show it; 07 and 08
   show the same screens once classes are picked. Seeding a sensible `classKey`
   per default row would remove the whole problem.
2. **`catalogValid` never checks accommodations.** It validates
   `vehicleClasses`, `passengerTypes` and `addOns` only — the array that gained
   an editor in this very rework was left out. A blank accommodation label saves
   silently, and the bar's own hint ("Every catalog row needs a label") is
   untrue when it happens.
3. **The class vocabularies can't represent the seeded labels.**
   `VEHICLE_CLASS_OPTIONS` is `Motor / Car / SUV / Van / 6-Wheeler /
   10-Wheeler`, but the seeded name is `"Car / SUV / Van"` — one row that has to
   collapse onto a single class. Same for `"Motorcycle / Tricycle"` and
   `"Light Truck / Elf"`. Either the defaults or the vocabulary needs splitting.
4. **`is_active` is the only snake_case field in the model.** Passenger rows use
   `is_active` (read defensively as `p.is_active !== false`), while vehicle,
   add-on and accommodation rows use `enabled` for exactly the same concept —
   four editors side by side, two names for one idea. The defensive read and the
   casing both suggest it arrived from an API payload rather than the seed.
5. **`descriptor` is still stored, still seeded, and no longer editable.** The
   Vehicle editor dropped its Descriptor column, but `defaultCatalog()` still
   seeds `"≤ 300 kg GVW"`, `"3.5 – 7 tons"` and friends. Meanwhile the **Name**
   placeholder is now `"e.g. ≤ 300kg GVW"` — the descriptor's own text. The
   field the operator can't reach holds the value the placeholder tells them to
   type somewhere else.
6. **`maxWeightKg` / `maxLengthM` are now unreachable.** The Max (kg / m) column
   is gone but both fields are still seeded on every vehicle class. Nothing in
   the UI reads or writes them.
7. **The rename stopped halfway.** `{ id: "vehicle-classes", label: "Vehicle
   types" }` — the section id, the anchor, the card key and the catalog key all
   still say "classes", and the type is still `VehicleClass`.
8. **The "STATUS" header doesn't fit its own column.** At 10px semibold
   uppercase with `tracking-[0.1em]` it measures ~45px against a 44px track, and
   it's `whitespace-nowrap` — so it overlaps "CLASS". The frames reproduce it
   because the app does.
9. **Two switch colours, no stated rule.** `RowStatusToggle` is emerald;
   `RuleToggle` on the Account tab is brand orange. Same size, same shape, same
   settings page, different colour — with nothing to tell an operator why.
10. **Deletes are still immediate and unguarded**, now across four editors
    instead of three. Given that Accommodations rows carry capacity and fare
    that vessels build on, this got riskier in the rework.

## Fidelity notes

- **One section renders per frame** — the rail swaps panels rather than
  scrolling; `activeSection` mounts exactly one editor.
- **The `Select` is drawn in `inline` mode**, which is how the editors pass it,
  so its menu is positioned inside the row's wrapper and paints over the rows
  below. Open menus are queued and drawn last, since Figma order is paint order.
- **The SaveBar's left offset is the static sidebar width (255)**; the component
  re-measures `<aside>` at runtime to follow a collapsed sidebar.
- **`motion.div` panel transitions, hover states and `active:scale` are not
  drawn.**
- **`font-mono` is honoured only where the source says `font-mono`** — the
  numeric catalog inputs and fare fields. Fields marked `tabular-nums` alone
  stay on the body sans.

## Verification

`node --check` plus the stubbed-Figma smoke harness (`smoke-config.js`) runs all
12 builders and checks reference errors, node counts, duplicate frame names,
text-range validity, frames overflowing 1440×900, and NaN geometry. All 12 build
clean, and the layout was rendered to SVG and eyeballed (`render-config.js`).
