# Tripket — Build Settings Section

A Figma plugin that rebuilds `app/settings/page.tsx` as native Figma frames —
real text, real vectors, real measurements. Nothing is a screenshot.

Settings is three tabs behind one route:

| Tab | What it is |
| --- | --- |
| **Account** | per-line profile, booking behaviour, booking rules, danger zone |
| **Configurations** | the line catalog — passenger types, vehicle classes, add-ons, accommodations. **The default tab** (`useState<TabId>("booking")`) |
| **System** `GLOBAL` | a static registry of platform-wide settings |

Sources transcribed:

| File | What comes from it |
| --- | --- |
| `app/settings/page.tsx` | all three tabs, the four editors, `Card`, `RuleToggle`, `AccountField` |
| `lib/settings-data.ts` | `DEFAULT_VEHICLE_CLASSES`, `DEFAULT_PASSENGER_TYPES`, `DEFAULT_ADD_ONS`, `defaultAccount()`, both provider lists |
| `components/SaveBar.tsx` | the pinned bottom bar and its disabled-hint state |
| `components/SuspendLineDialog.tsx` | the type-to-confirm disable dialog |
| `components/RowMenu.tsx` / `Select.tsx` | the System row menu, the provider selects |

## Install

Figma → **Plugins → Development → Import plugin from manifest…** → pick
`figma-plugin-settings/manifest.json`. Plugin id `tripket-settings-allstates`,
so it installs alongside the other eight.

Creates (or reuses) a section named **`Settings — All states`** below every
existing section, **4 frames per row** at 1440×900. **Additive** — a frame whose
name already exists is skipped, never replaced. Append new builders at the
**end** of `BUILDERS`; grid position derives from the array index.

## The 17 frames

**Configurations** — the default landing tab

| # | Frame | State |
| --- | --- | --- |
| 01 | Passenger types | the landing state: rail + 4 seeded fare categories |
| 02 | Vehicle classes | all 6 classes with max, slots, fare and companions |
| 03 | Add-ons | the 4 default extras |
| 04 | Accommodations placeholder | the dashed "No accommodation tiers yet" card |
| 05 | Discount unit — Flat ₱ | the ₱/% segmented toggle flipped on one row |
| 06 | Unsaved changes — Save bar | the pinned bar, brand dot, Save live |
| 07 | Blank label — Save disabled | rose dot, "Every catalog row needs a label" |
| 08 | Empty catalog | "No vehicle classes. Add one to make it available to vessels." |

**Account**

| # | Frame | State |
| --- | --- | --- |
| 01 | Line profile | identity strip + the five profile fields |
| 02 | Booking rules + Danger zone | scrolled: providers, three rule toggles, danger zone |
| 03 | Line disabled | the danger zone's rose copy + "Enable shipping line" |
| 04 | Payment provider open | the portaled `Select` menu |
| 05 | Unsaved changes — Save bar | the account tab's own dirty state |
| 06 | Disable line — Empty confirm | dialog open, CTA at 50% |
| 07 | Disable line — Name typed | "2GO Travel" matched, CTA live |

**System**

| # | Frame | State |
| --- | --- | --- |
| 01 | System settings table | all 10 rows, scope + editable pills, dashed Add Setting |
| 02 | Row menu open | the single "View setting" item |

## Seed data is literal

Every catalog row comes from `defaultCatalog()` — the six vehicle classes, four
passenger types and four add-ons exactly as `lib/settings-data.ts` declares
them, including descriptors like `≤ 3,500 kg GVW` and `RoRo-only · cleaned on
arrival`. The Account tab is `defaultAccount("2GO Travel", "2go")`, so
`support@2go.ph`, `https://www.2go.ph` and the `bookingProvider: "2GO Travel"`
default are all derived, not invented. `SYSTEM_SETTINGS` is copied verbatim from
the page file, including the truncated `"…locking a…"` description.

## Measurements

`html { font-size: 17px }`: `p-6` → 25.5, `px-4` → 17, `py-3.5` → 14.875,
`w-52` (rail) → 221, `gap-6` → 25.5, `h-9` (discount control) → 38.25.
Literal px classes do **not** scale — the `160px` / `96px` / `80px` / `72px` /
`36px` grid tracks in the editors, `h-[22px] w-[38px]` switches with
`translate-x-[18px]`, `max-w-[280px]` on the System value cell, and
`min-w-[900px]` on that table.

The editors use CSS-grid `fr` units, resolved here the same way the browser
does: subtract the fixed tracks and the gaps, then split the remainder by the
`fr` weights. Passenger types is `[1.4fr 160px 1.4fr 36px]`; vehicle classes is
`[1.4fr 1.2fr 96px 80px 96px 72px 36px]`; add-ons is `[1.3fr 1.5fr 96px 36px]`.

## Things I found in the source — flagged, not fixed

1. **The app has two incompatible role vocabularies.** The Danger zone is gated
   on `user?.role === "admin"` from `UserContext`, which uses lowercase
   `"admin" | "operator"`. But `lib/users-data.ts` — the directory that actually
   creates accounts — uses `"Superadmin" | "Admin" | "Operator"`. No record from
   the Accounts pages can ever satisfy the Settings gate. Today it works only
   because `UserContext` is a separate hard-coded stub; the moment the two are
   wired together, the Danger zone silently disappears for every real admin.
2. **The rail says "On this page" but it isn't a table of contents.** Each
   section has an anchor id (`id="passenger-types"`), which implies scroll-to.
   In fact only the active section is mounted — the code comment says
   "Tab-style navigation … swaps the visible panel" — so the anchors are
   unreachable, `jumpTo` just resets `scrollTop`, and there is never more than
   one section on the page to navigate between. It's a tab bar wearing a TOC's
   label.
3. **`requireAddress` defaults differently depending on how the line was
   created.** `defaultAccount()` sets it to `true`; `CreateLineDialog`
   initialises the same field to `false`. Two lines can therefore start with
   opposite booking rules for no reason the operator can see.
4. **The System tab is entirely inert.** `SYSTEM_SETTINGS` is a literal array in
   the page file, "Add Setting" has no `onClick`, and the row menu's only item
   is `{ label: "View setting", onClick: () => {} }`. Nothing reads or writes
   any of it. The `Editable` / `Read only` pill is decorative — even the rows
   marked editable have no edit affordance.
5. **The System content belongs to a different product.** "Acme CMS", "PHP
   Version 8.3.6", `auth.password_policy`, `files.allowed_types` — this is a
   Laravel-style CMS registry sitting inside a ferry-booking admin, on a tab
   badged `GLOBAL`. Worth deciding whether it's a placeholder or scope creep
   before it ships.
6. **Catalog deletes are immediate and unguarded.** `RemoveButton` drops the row
   straight out of the draft — no confirm, no undo beyond discarding *every*
   edit on the tab. Given the comment that these edits "flow live into every
   vessel that uses them", deleting a class that vessels depend on is a click
   away.
7. **The System table can't fit its own card.** `min-w-[900px]` inside
   `overflow-x-auto` in a 1066px card means Description and Value are squeezed
   and the row wraps to three or four lines. The frames reproduce the squeeze —
   the deficit is taken from the two wrapping columns proportionally, which is
   what the browser does.
8. **`bookingProvider` defaults to a value that isn't in the list.**
   `defaultAccount()` sets it to the line *name* ("2GO Travel"), which is not in
   `BOOKING_PROVIDERS`. The page compensates by prepending `displayName` and
   appending the saved value, so the Select never renders empty — a guard that
   exists because the default is out-of-set. (The Accounts pager has the same
   class of bug and no guard; see that plugin's README.)
9. **Save is gated on labels only.** `catalogValid` checks that every catalog row
   has a non-empty label — but a class with no fare, no slots and no descriptor
   saves happily, and `defaultPrice` falls back to `0`, which is a free vehicle.

## Fidelity notes — where I did not transcribe literally

- **Only one Configurations section renders per frame**, because that's how the
  page works — the rail swaps panels rather than scrolling a long document.
- **The SaveBar's left offset is the static sidebar width (255).** In the app it
  measures `<aside>` every 400ms so it tracks the collapsed sidebar; these frames
  show the expanded state.
- **`motion.div` section transitions and `motion.tr` staggers are not drawn**,
  nor hover states (the logo's camera overlay, row tints, `active:scale`).
- **The logo uploader shows the seeded 2GO bitmap**; a user-uploaded logo is a
  runtime `FileReader` data URL.
- **`font-mono` is honoured only where the source says `font-mono`** — the line
  id, the System key/value cells, the expected-name line in the disable dialog,
  and the numeric catalog inputs. Everything else with `tabular-nums` stays on
  the body sans (the same correction applied to the Accounts and Activity-logs
  plugins).

## Verification

`node --check` plus the stubbed-Figma smoke harness (`smoke-settings.js`) runs
all 17 builders and checks reference errors, node counts, duplicate frame names,
text-range validity, dialog height against the 810px `max-h-[90vh]` cap, frames
overflowing 1440×900, and NaN geometry. All 17 build clean.

Two bugs were caught by rendering the built tree to SVG and then probing node
geometry numerically (`render-settings.js`): the System row menu ran off the
right edge of the frame when the column naturals overflowed, and the System rows
were sized from a predicted height rather than the real one, so wrapped
descriptions bled into the next row. Rows are now measured from the cells after
they exist.
