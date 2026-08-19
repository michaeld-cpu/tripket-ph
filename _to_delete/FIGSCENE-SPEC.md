# Figscene — product spec (draft)

**Working name.** One Figma plugin, installed once, that never changes. A prompt
document a designer pastes into whatever agent they use. The agent reads their
codebase and writes a JSON file. The designer drops that file on the plugin and
gets native Figma frames.

Tripket is the reference example, not the product.

---

## 0. Naming — fix this before it spreads

In Figma, `manifest.json` already means *the plugin's own install descriptor*.
If the agent's output is also called `manifest.json`, designers will try to
install it as a plugin and get an error.

| File | Owner | Purpose |
| --- | --- | --- |
| `manifest.json` | us, ships once | the Figma plugin install descriptor |
| **`screens.json`** | the agent, per project | the scene description that gets uploaded |

Names are provisional — `.figscene.json` also works. Just not "manifest".

---

## 1. The three pieces

```
   PROMPT.md                    screens.json                  the plugin
   ─────────                    ────────────                  ──────────
   designer pastes    →   agent reads their code    →    designer drops the
   into their agent        and writes this file          file in, gets frames
   (Claude/GPT/Cursor)
```

1. **The plugin** — UI drop zone, schema validator, layout renderer, theme
   resolver. Generic: knows nothing about any particular app.
2. **`PROMPT.md`** — what the designer pastes. Teaches the agent the schema and
   the house rules. This is the product's real interface.
3. **`schema.json`** — the contract. JSON Schema so agents and editors can
   self-validate before anything reaches Figma.

---

## 2. The schema: layout primitives, no coordinates

The agent **never computes an x/y**. It emits nesting and spacing; the plugin
resolves geometry with Figma auto-layout.

This matters because every single layout bug in the ten hand-written Tripket
plugins was geometry arithmetic — a row height that didn't account for a wrapped
line, a menu that ran off the frame, a column that absorbed all the slack.
Moving that math into the plugin removes the whole error class.

```json
{
  "version": "0.1",
  "theme": { "root": 17, "color": { "brand-600": "#EA580C" }, "space": [0,4.25,8.5] },
  "screens": [
    {
      "name": "Accounts / Users / 01 — Directory",
      "size": [1440, 900],
      "section": "Accounts — All states",
      "children": [
        { "row": {
            "pad": [4, 5], "between": true, "align": "center",
            "bg": "white", "radius": "2xl", "border": "slate-200",
            "children": [
              { "text": "Platform users", "style": "h2" },
              { "input": { "placeholder": "Search name or email", "w": "204px" } }
            ] } }
      ]
    }
  ]
}
```

### Vocabulary (deliberately small)

| Kind | Names |
| --- | --- |
| Containers | `stack` (vertical) · `row` (horizontal) · `box` (plain frame) · `grid` |
| Leaves | `text` · `icon` · `image` · `rule` (hairline / divider) |
| Composites | `pill` · `input` · `switch` · `avatar` · `button` · `table` |
| Escape hatch | `overlay` — absolutely positioned, with an anchor |

`overlay` is not optional. Dropdowns, row menus, date popovers, scrims and
modals cannot be expressed in auto-layout — they float over their siblings. In
Figma this is `layoutPositioning = 'ABSOLUTE'` plus an anchor rule
(`below`, `above`, `right-align`, `center`), and the plugin flips it when it
would leave the frame. That flip logic is exactly what had to be hand-written
three separate times in the Tripket plugins; here it lives in one place.

### The unit rule — this is the good part

> **A number is a token step. A string with a unit is a literal.**

```json
"pad": 4        →  theme.space[4]   = 17px   (scales with the design system)
"pad": "68px"   →  exactly 68px              (never scales)
"w": "204px"    →  exactly 204px
"radius": "lg"  →  theme.radius.lg
```

Two of the nastiest traps in this codebase become structural rather than
tribal knowledge:

- **The 17px root.** Tripket's `globals.css` sets `html { font-size: 17px }`, so
  every Tailwind rem utility is 17px-based, not 16. That lived in my head and in
  a README warning. Here it is `theme.root: 17` — one field, and the plugin does
  the multiplication.
- **Literal px classes.** `w-[360px]`, `h-[68px]`, the `44px` status column —
  these must *not* scale with the root, and getting it wrong silently shifts a
  whole layout. The number-vs-string distinction makes it impossible to confuse.

### Theme block

```json
"theme": {
  "root": 17,
  "color":  { "brand-600": "#EA580C", "slate-900": "#0F172A" },
  "space":  [0, 4.25, 8.5, 12.75, 17, 21.25, 25.5],
  "radius": { "md": 6.375, "lg": 8.5, "xl": 12.75, "2xl": 17, "full": 999 },
  "text":   { "h2": { "size": 17, "weight": "semibold", "color": "slate-900" } }
}
```

Any team points this at their own Tailwind config. Tripket's values ship as the
worked example.

---

## 3. What the plugin does

```
  drop file  →  validate  →  resolve theme  →  build  →  report
```

**Validate first, and fail usefully.** An agent will emit slightly-wrong JSON;
that is a certainty, not a risk. The validator must say
`screens[2].children[11]: unknown prop "padding" — did you mean "pad"?` and
refuse to draw. A validate-only button in the UI lets a designer check a file
without touching the canvas.

**Build.** Containers become auto-layout frames; `gap` → `itemSpacing`, `pad` →
`padding*`, `align`/`justify` → the axis alignment props, `grow: 1` →
`layoutGrow`. Known Figma gotchas the renderer must respect (all learned the
hard way already): `layoutSizing*` only after `appendChild`; `FILL` is invalid on
absolute-positioned children; `resize()` before sizing modes; `loadFontAsync`
before any text write; fills are read-only arrays — clone and reassign.

**Keep the proven run semantics** from the Tripket plugins:
- one Figma **section per screen group**, found by name
- **additive** — a screen whose name already exists is skipped, never replaced;
  report `Added 3 · kept 17`
- delete a frame and re-drop to refresh just that one

**Report.** Screens built, skipped, and any node the theme couldn't resolve.

---

## 4. `PROMPT.md` — the designer's half

Two parts.

**Part A, for the human:** install the plugin once; point your agent at your
repo; drop the file it produces. Three rules: don't rename sections, delete-then-
re-drop to refresh, runs are additive.

**Part B, a fenced block to paste into any agent.** Must carry: the schema (or a
link to it); *emit no coordinates*; the number-vs-string unit rule; read the
theme from the project's Tailwind config and put it in `theme`; prefer real seed
data from the codebase's own deterministic mock builders over invented rows;
validate with the CLI before handing the file over; and flag anything that looks
like a bug in the source rather than silently fixing it.

That last rule earned its place — across ten Tripket modules, reading the source
closely surfaced real defects every time (a blank page-size selector, a column
showing the wrong shipping line, an audit log that never names an actor). Those
findings turned out to be worth as much as the frames.

---

## 5. Testing without Figma

Same approach that caught every bug this session, but now reusable by anyone:

```
figscene validate screens.json     → schema + theme errors, exit 1 on failure
figscene render   screens.json     → SVG per screen, for eyeballing
figscene probe    screens.json     → node geometry dump, for overlap assertions
```

Ship as a small Node CLI. The agent can run `validate` itself before handing the
file over, which closes the loop without a human in it.

---

## 6. Proof: three Tripket screens

The schema is proven when these three render from JSON identically to the
hand-written plugins, in increasing difficulty:

1. **`Reports / 01 — Coming Soon`** — one centred stack. Trivial; proves the
   pipeline end to end.
2. **`Accounts / Users / 01 — Directory`** — page header, toolbar, table, pager.
   The bread-and-butter case; proves tables and space distribution.
3. **`Config / 06 — Vehicle class select open`** — an inline dropdown floating
   over table rows. Proves the `overlay` escape hatch and the paint-order rule.

If #3 comes out right, the vocabulary is sufficient.

---

## 7. Phasing

| # | Phase | Ships |
| --- | --- | --- |
| 1 | Schema v0.1 + JSON Schema + Node validator | a contract you can test against, no Figma needed |
| 2 | Node SVG renderer for the schema | proof #1 renders correctly outside Figma |
| 3 | Plugin: UI drop zone, validate, containers + text | proof #1 in Figma |
| 4 | Composites (`pill` `input` `switch` `table`) + `overlay` | proofs #2 and #3 |
| 5 | Theme resolution; optionally bind to Figma Variables | a rebrand is one edit |
| 6 | `PROMPT.md`, docs, Tripket reference theme | the actual product |

Phases 1–2 are pure Node and testable immediately. Nothing before phase 3 needs
Figma at all.

**The ten existing Tripket plugins keep working and need no changes.** They
become the reference output — the thing new schema work is diffed against.
Regenerating all 215 frames from JSON is possible later but is not required for
the product to be useful.

---

## 8. Honest risks

1. **Agent output reliability is the whole product.** If agents can't emit valid
   JSON consistently, nothing else matters. Mitigations: a deliberately tiny
   vocabulary, few required props, strict validation with suggest-a-fix errors,
   and a CLI the agent can self-check with. Worth testing against two or three
   different agents early — before phase 4.
2. **`table` is a slippery slope.** It is the one composite that badly wants to
   grow (sticky columns, sortable headers, pagers, empty states). Each addition
   is a plugin update, which erodes the "designers just upload" promise. Keep it
   thin and let `row`/`stack` cover the rest.
3. **Auto-layout can't do everything.** Some real layouts genuinely need
   absolute positioning. `overlay` covers the common cases; there will be a long
   tail.
4. **Theme drift.** Nothing stops a `screens.json` theme block from going stale
   against the project's Tailwind config. A `figscene theme --from tailwind.config.ts`
   extractor would fix it, and is worth considering for phase 5.

---

## 9. Open questions

- **Name.** "Figscene" is a placeholder.
- **`table` in v0.1 or not?** Excluding it makes the vocabulary purer and proof
  #2 harder. My instinct: include a thin one, because tables are most of what an
  admin UI is.
- **Distribution.** Figma Community plugin, or private/org-only? Affects review
  requirements and whether `networkAccess` can stay `none`.
- **Multi-file input.** One `screens.json` per module, or one big file per
  project? Additive runs make many small files the safer default.
