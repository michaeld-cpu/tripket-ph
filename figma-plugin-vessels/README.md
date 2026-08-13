# Tripket — Build "Vessels — All states"

The third Figma plugin in the set, after Tickets and Routes. It builds
**23 frames** from `app/vessels/page.tsx` into a **brand-new section** it creates
itself — nothing already in the file is touched.

## Install & run

1. Open **Tripket.ph** in the **Figma desktop app**.
2. Menu → **Plugins → Development → Import plugin from manifest…**
3. Pick `manifest.json` from **this** folder (`figma-plugin-vessels/`).
   It installs alongside the other two — different `id`, different entry.
4. Menu → **Plugins → Development → Tripket — Build Vessels Section**.

The plugin finds the page holding your Tickets section, measures the bottom of
every section on it, and drops a new **"Vessels — All states"** section 400px
clear of everything. Re-runs are additive: it reuses that section and only
builds frame names that aren't in it yet.

The section lays out **4 frames per row** (`GRID_COLS = 4`). The Routes plugin
was switched to match; the Tickets plugin is still on 3 — same one-line change
near the `GRID_COLS` constant if you want all three to agree.

## The 23 frames

**Registered vessels (01–09)**

| # | Frame | State |
|---|---|---|
| 01 | View fleet — Loading | `TableSkeleton rows={9}` |
| 02 | View fleet — Default list | All nine 2GO hulls, `Showing 1–9 of 9 vessels` |
| 03 | Search vessel or IMO — Results | Query `St.`, five matches |
| 04 | Search vessel or IMO — No results | `No vessels match your filters.` |
| 05 | Filter by type — Menu open | All types / RoRo / Fast Craft |
| 06 | Filter by status — Menu open | All status / Active / Inactive |
| 07 | Rows per page — Selector open | 10 / 25 / 50 / 100 |
| 08 | Status pill — Tooltip on hover | `In dry dock or repair · returns once cleared` |
| 09 | Fleet empty — Register first vessel | `EmptyState kind="fleet"` |

**Row actions (01–03)** — two items, and which second item you get

| # | Frame | Menu |
|---|---|---|
| 01 | Active vessel | Edit vessel · **Disable vessel** (rose) |
| 02 | Maintenance vessel | Edit vessel · **Enable vessel** |
| 03 | Retired vessel | Edit vessel · **Enable vessel** |

**IMO (01)**

| # | Frame | State |
|---|---|---|
| 01 | Copy IMO — Copied | Copy glyph swaps to an emerald check + `IMO 9756101 copied` toast |

**Add vessel (01–04)**

| # | Frame | State |
|---|---|---|
| 01 | Empty form — Register disabled | Name empty, primary at `opacity-60` |
| 02 | Fast Craft picked — Ready to register | Type card selected, primary live |
| 03 | Scrolled to Status — Below the fold | Same dialog scrolled to the end |
| 04 | Vessel added — Toast | `FC Camotes Flyer added to 2GO Travel` |

**Edit vessel (01–02)**

| # | Frame | State |
|---|---|---|
| 01 | Dialog open | Identical body to Add, plus the `· IMO 9756101` chip |
| 02 | Vessel updated — Toast | `MV Palawan Breeze updated` |

**Vessel status (01–04)**

| # | Frame | State |
|---|---|---|
| 01 | Disable vessel — Confirm dialog | Rose badge, `Disable vessel` |
| 02 | Enable vessel — Confirm dialog | Emerald badge, `Enable vessel` |
| 03 | Vessel disabled — Toast | `showToast(…, "error")` — red variant |
| 04 | Vessel activated — Toast | Default success — brand variant |

## Things I found in the source you may want to know

Real behaviours in the current code, reproduced faithfully in the frames.
Several look like bugs — flagging rather than silently "fixing" them.

1. **The ID column is a hash, not a row number.** `shortVesselId()` is FNV-1a
   over the vessel id, mod 100 — so the fleet reads 56, 13, 94, 51, 32, 89, 70,
   23, 4. It isn't sequential, isn't sorted, and isn't stable if ids change.
   Two vessels can also collide on the same number. The frames show the real
   values. If this is meant to be a display reference, it needs to come from the
   record, not a hash.

2. **Inactive and Retired render identically.** `statusTone` gives both
   `bg-slate-100 text-slate-500`, so the pill alone can't distinguish "paused"
   from "gone from the fleet" — only the label differs, and the tooltip.
   Retired arguably wants its own tone.

3. **The status filter can't reach two of the four statuses.** The Select offers
   All status / Active / Inactive only, but vessels can be **Maintenance** or
   **Retired** — two of the nine seeded 2GO hulls are. There is no way to filter
   for them, and no way to filter them out.

4. **The type filter is missing Passenger Ship.** Same shape of gap: the Select
   offers All types / RoRo / Fast Craft, but `Vessel["type"]` has three members.

5. **Every non-Active vessel offers "Enable vessel".** The row menu branches on
   `v.status === "Active"`, so a **Retired** hull gets a one-click Enable that
   flips it straight to Active — no confirmation that it's being un-retired, and
   the dialog copy just says "will be set to Active". Frame Row actions / 03
   documents this.

6. **The confirm dialog no longer matches its own docstring.** `DeleteVesselDialog.tsx`
   says disabling "requires typing the vessel name (same pattern as the old
   delete dialog)". There is no such input — both paths are a single-click
   confirm. Either the guard was dropped or the comment was never updated.

7. **Capacity is not editable anywhere.** `EditVesselModal` hydrates
   `passengers` and `vehicleSlots` into its form state and its `step1Valid`
   check requires them to be non-empty — but `VesselFormBody` renders no input
   for either. They pass through unchanged on save. `AddVesselModal` computes
   `passengers` from `defaultAccommodations`, which are all zero-capacity, so
   **every vessel created through the dialog is registered with 0 passengers and
   0 vehicle slots.**

8. **The Add wizard's later steps are orphaned.** `AddVesselModal` exports
   `StepIndicator`, `Step2` and `Step3Review`, and `STEP_COPY` still describes
   three steps — but the dialog is a single identity page and never renders any
   of them. Both Add and Edit show `STEP_COPY[1]` as their caption.

9. **`typeTone` is three identical values.** RoRo, Fast Craft and Passenger Ship
   all map to `border border-gray-200 text-gray-600`, so the Type pill carries
   no colour information. Drawn as-is.

10. **Row click and cell click fight each other.** The `<tr>` navigates to
    `/vessels/{id}`, and the IMO and actions cells call `stopPropagation()` to
    opt out. The Status and Type cells don't — clicking a status pill navigates.
    Worth deciding whether that's intended.

11. **`VesselAvatar` collides on saint names.** `vesselInitials()` takes the
    first letter of the first two non-stopword words, so **MV St. Augustine** and
    **MV St. Anthony** both render `SA`, and every `MV St. …` hull starts with S.
    Five of nine vessels are `S*`. Visible in the default-list frame.

12. **The pager is below the fold at 1440×900 with nine rows.** Nine rows put
    the footer at ~836px. That's why frame 07 uses the searched short list —
    it's the only one where the Per page control and the running count are
    actually visible on a laptop screen.

13. **The Add/Edit form overflows its own dialog.** `VesselFormBody` is ~607px
    tall; the wrapper caps it at `max-h-[60vh]` = 540px here. The **Status**
    field sits below that fold on first open, which is why frame Add vessel / 03
    exists. Either trim a field or raise the cap.

14. **LinePicker is a read-only mirror, not a picker.** It always shows the
    top-bar switcher's active line, calls `onChange` back in a `queueMicrotask`
    to keep form state in sync, and tells the admin to change context up top.
    It's labelled a required field with an asterisk, which reads as editable.

## Shared-layer note

Everything above the `V1.` marker is the chassis shared with the Tickets and
Routes plugins — sidebar, topbar, page header, modal shell, toast, skeleton,
embedded logos, text measurement. Two deliberate deviations in this plugin:

- **`GRID_COLS` is 4** (Tickets is still 3).
- **`max-w-md` is 476px here**, the correct 17px-root figure, matching the
  Routes plugin's confirm dialogs. `buildFiltersDialog` in the chassis still
  uses the 16px figure of 448 — the Vessels page doesn't mount that dialog, so
  it doesn't come up, but the note carries over.

`PageHeader` in the chassis only knows the Export variant. The Vessels page
passes `right={<Add vessel button/>}`, so `vesselsPageHeaderAction()` removes
the Export button the shared builder emits and puts the brand button in its
place. If the chassis ever grows a `right` slot, drop that shim.

## Tuning

Vessels-specific data sits under the `V1.` marker in `code.js`:

- `VESSELS` — the nine 2GO hulls from `lib/dashboard-data.ts`, with `n`
  (`shortVesselId`) and `ini` (`vesselInitials`) precomputed.
- `VESSELS_SEARCH` — the subset behind the `St.` query.
- `V_TONE` / `V_STATUS_HINT` — the status palette and its tooltip copy.
- `TYPE_OPTIONS` / `STATUS_OPTIONS` — the two toolbar Selects, as narrow as
  the page actually makes them.
- `VESSEL_TYPE_CARDS` / `FORM_STATUSES` — the Add/Edit form's controls.
- `vesselMenuItems(status)` — the row-menu branch.
- `SECTION_NAME` — rename the target section.
