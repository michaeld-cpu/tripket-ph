# Design mirroring — code → Figma plugin → native frames

How the `figma-plugin-*` folders work, why the flow is cheap to run, and how the
token tables move to Figma Variables next.

---

## 1. What this is

Ten Figma plugins that rebuild the admin app as **native Figma frames** — real
text nodes, real vectors, real geometry. Nothing is a screenshot, so every frame
is selectable, measurable and editable in Figma.

| Plugin | Plugin id | Section | Frames |
| --- | --- | --- | --- |
| `figma-plugin-routes` | `tripket-routes-allstates` | `Routes — All states (v3)` | 31 |
| `figma-plugin-vessels` | `tripket-vessels-allstates` | `Vessels — All states` | 23 |
| `figma-plugin-bookings` | `tripket-bookings-allstates` | `Bookings — All states` | 40 |
| `figma-plugin-tickets` | `tripket-tickets-allstates-v2` | `Tickets — All states (v2)` | 45 |
| `figma-plugin-lines` | `tripket-lines-addline` | `Shipping lines — Add line` | 16 |
| `figma-plugin-reports` | `tripket-reports-allstates` | `Reports — All states` | 1 |
| `figma-plugin-accounts` | `tripket-accounts-allstates` | `Accounts — All states` | 20 |
| `figma-plugin-activity-logs` | `tripket-activity-logs-allstates` | `Activity logs — All states` | 10 |
| `figma-plugin-settings` | `tripket-settings-allstates` | `Settings — All states` | 17 |
| `figma-plugin-settings-config` | `tripket-settings-configurations` | `Settings · Configurations — All states` | 12 |

**215 frames.** Every plugin has its own id, so all ten install side by side.

---

## 2. The flow

```
  read the .tsx source          →  the only step that costs real thinking
  transcribe to builder code    →  geometry from Tailwind classes, not eyeballing
  smoke-test (node, no Figma)   →  reference errors, overflow, NaN, bad text ranges
  render to SVG + probe geometry→  catches overlap the smoke test can't see
  run the plugin in Figma       →  Figma does the drawing, locally, for free
```

Steps 3 and 4 run entirely in Node against a stubbed `figma` global
(`smoke-*.js`, `render-*.js`). Bugs get caught before Figma is ever opened.

---

## 3. Anatomy of a plugin

Each `code.js` is three parts concatenated:

```
lines   1– 17   header comment      ← per-plugin
lines  18–977   THE CHASSIS         ← byte-identical across all ten
lines 978–end   the module          ← per-plugin: seed data, builders, frames
```

The chassis is **960 lines, verified byte-identical** in all ten plugins (the
only variable is `GRID_COLS`). It holds:

| Section | Contents |
| --- | --- |
| 1. Tokens | `C` (55 colours), `SP` (12 spacings), `RAD`, `FS` (18 sizes) |
| 2. Embedded assets | base64 logos, so the plugin needs no network |
| 3. Primitives | `frame` `rect` `text` `icon` `svgNode` `measure` `hairline` |
| 4. Icons | verbatim path data lifted from the source components |
| 7. Shared chrome | `buildSidebar` `buildTopbar` `buildShell` |
| 8. Table primitives | `layoutColumns` `statusPill` `buildRowMenu` `buildPager` … |
| — | `buildModal` `buildScrim` `buildSkeleton` `loadFonts` |

`manifest.json` is tiny and does one job — point Figma at `code.js` and give the
plugin a unique id:

```json
{ "name": "…", "id": "tripket-<module>-allstates", "api": "1.0.0",
  "main": "code.js", "editorType": ["figma"],
  "documentAccess": "dynamic-page", "networkAccess": { "allowedDomains": ["none"] } }
```

`networkAccess: none` matters: the plugin cannot phone home, which is why it can
be run against a production design file without review.

---

## 4. Three rules that keep re-runs safe

1. **The section name is the primary key.** `main()` does
   `findOne(n => n.type === 'SECTION' && n.name === SECTION_NAME)`. Rename a
   section in Figma and the next run builds a *duplicate* instead of updating it.
   This is why the Back Office page numbering lives in the orange banners and
   **not** in the section names.
2. **Runs are additive.** Existing frame names are collected first and skipped —
   `Added 3 frames · kept 17 existing`. To refresh one frame, delete that frame
   and re-run.
3. **Append new builders at the END of `BUILDERS`.** Grid position is derived
   from the array index, so inserting in the middle shifts every later frame onto
   an occupied slot.

---

## 5. Why this is cheap to run

The cost difference is structural, not incidental:

| | Plugin flow | Driving Figma over MCP |
| --- | --- | --- |
| What crosses the wire | the script, once | every node, every property, every read-back |
| Who draws | Figma, locally | the model, node by node |
| 215 frames ≈ | one file per module | tens of thousands of tool round-trips |
| Re-running | free — it's a local script | full cost again |

One measurement from this repo: `get_metadata` on the Back Office page returned
**10.6 million characters** — too large to read in one pass, and that is *just
the structure*, before any drawing. The same page's ten sections are produced by
~21,000 lines of plugin code that Figma executes locally.

**MCP is still the right tool for the other direction** — reading an existing
file, screenshotting, reorganising a page, editing nodes someone else made. That
is exactly what it was used for on the Back Office cleanup: read the page,
reposition 18 nodes, clone 4 headers. Small, surgical, read-mostly.

Rule of thumb: **generate with a plugin, inspect and rearrange with MCP.**

---

## 6. Next: moving the token tables to Figma Variables

Today the chassis hardcodes values (`C.brand600 = '#EA580C'`, `SP.s6 = 25.5`).
Those four tables are already a token system — they just aren't *bound*, so a
brand change means re-running every plugin instead of flipping one variable.

### What maps cleanly

| Chassis table | Variable type | Bind via | Scopes |
| --- | --- | --- | --- |
| `C` — 55 colours | `COLOR` | `setBoundVariableForPaint(paint,'color',v)` | `FRAME_FILL` `SHAPE_FILL` `TEXT_FILL` `STROKE_COLOR` |
| `SP` — 12 spacings | `FLOAT` | `setBoundVariable('itemSpacing'\|'paddingLeft'…)` | `GAP` `WIDTH_HEIGHT` |
| `RAD` — 5 radii | `FLOAT` | `setBoundVariable('topLeftRadius'…)` | `CORNER_RADIUS` |

### What does not map — read this before planning

- **`cornerRadius` is not bindable.** You must bind the four corners
  individually (`topLeftRadius`, `topRightRadius`, `bottomLeftRadius`,
  `bottomRightRadius`). The chassis `frame()` helper sets `cornerRadius`, so it
  needs a small change.
- **`setBoundVariableForPaint` returns a NEW paint.** Capture and reassign it —
  mutating in place silently does nothing.
- **`FS` (font sizes) *is* bindable — corrected.** An earlier draft of this
  section said font size was not bindable, on the strength of a patterns doc.
  The typings say otherwise: `VariableBindableTextField` is
  `fontFamily | fontSize | fontStyle | fontWeight | letterSpacing | lineHeight |
  paragraphSpacing | paragraphIndent`, and `setBoundVariable` accepts it. So
  `FS` maps to `FLOAT` variables with the `FONT_SIZE` scope, and text styles are
  a separate, additional convenience rather than the only option.
- **Pass `Variable` objects, never id strings.** The
  `setBoundVariable(field, variableId: string)` overload is deprecated and
  *throws* when the manifest sets `documentAccess: dynamic-page` — which all ten
  manifests do.
- **Shadows cannot be variables at all.** `CARD_SHADOW`, `DIALOG_SHADOW`,
  `MENU_SHADOW`, `MODAL_SHADOW` become four **effect styles**
  (`figma.createEffectStyle()`).
- **Literal px classes must stay literal.** `w-[360px]`, `h-[68px]`,
  `w-[38px]`, `min-w-[940px]`, the `44px` Status track — these do **not** scale
  with the 17px root and must not become spacing variables, or the frames stop
  matching the app.

### Proposed collections

```
Tripket / Primitives      brand-50…900, slate-*, emerald-*, rose-*  (raw hex)
Tripket / Semantic        surface, border-subtle, text-muted, danger-fg → alias Primitives
Tripket / Spacing         s0_5 … s9  (4.25 → 38.25, the 17px-root scale)
Tripket / Radius          md 6.375 · lg 8.5 · xl 12.75 · 2xl 17 · full 999
```

Semantic aliases to primitives (`{ type: 'VARIABLE_ALIAS', id: primitive.id }`)
so a rebrand is one edit at the primitive layer.

### Modes — the constraint that shapes everything

Mode limits are plan-dependent: **Free = 1, Professional = 4,
Organization/Enterprise = 40+.** So "a mode per shipping line" (seven lines)
needs Enterprise. On Professional, use modes for Light/Dark and keep per-line
brand colour as a separate collection.

### Migration sketch

```js
// once per file — build the collections, then reuse by name
const varByName = {};
for (const v of await figma.variables.getLocalVariablesAsync()) varByName[v.name] = v;

function fillVar(node, name) {
  const v = varByName[name];
  if (!v) throw new Error('missing variable: ' + name);
  node.fills = [figma.variables.setBoundVariableForPaint(
    { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v)];
}
```

Then the chassis `frame()` / `text()` helpers take an optional token *name*
alongside the hex, and bind when the variable exists:

```js
frame(parent, 'Card', x, y, w, h, { bg: C.white, bgVar: 'Semantic/surface' })
```

Falling back to the hex keeps all ten plugins working in files that have no
variables yet — so the migration can be incremental.

### Staged plan

1. **Emit, don't bind.** One new plugin creates the collections and variables
   from `C` / `SP` / `RAD`. Nothing else changes. Low risk, immediately useful.
2. **Bind the chassis.** Add `bgVar` / `strokeVar` / `radiusVar` to `frame()`,
   `rect()` and `text()`. All ten plugins inherit it — that is the payoff of a
   byte-identical chassis.
3. **Effect styles** for the four shadows, applied via `effectStyleId`.
4. **Text styles** for `FS` × weight — optional now that `fontSize` is known to
   be bindable directly; a style still buys you one-click reuse in the UI.
5. **Code Syntax** — `variable.setVariableCodeSyntax('WEB', 'var(--brand-600)')`
   so Figma shows the Tailwind/CSS name next to each token and Dev Mode reads
   back something a developer can paste.

Step 5 is what closes the loop: today the flow is one-directional (code → Figma).
With Code Syntax on every variable, a designer changing a token in Figma produces
a value a developer can trace straight back to `tailwind.config.ts`.

---

## 7. Adding a new module — checklist

1. Read the route's `.tsx` **and** its data file; transcribe geometry from the
   Tailwind classes (`px-5` → 21.25 — the root is **17px**, not 16px).
2. Copy the chassis, append a module section, give it a fresh `SECTION_NAME` and
   a unique plugin `id`.
3. Prefer **literal seed data** — if the source's mock builder is deterministic,
   run it in Node and transcribe the real output rather than inventing rows.
4. `node --check`, then the smoke harness, then render to SVG and probe the
   geometry numerically. Eyeballing a downscaled PNG hides overlap.
5. README with the frame list, the measurement notes, and a numbered
   **"Things I found in the source"** — flagged, never silently fixed.
