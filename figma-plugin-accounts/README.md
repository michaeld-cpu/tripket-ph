# Tripket — Build Accounts Section

A Figma plugin that rebuilds the **Accounts** nav group as native Figma frames —
real text, real vectors, real measurements. Nothing is a screenshot.

"Accounts" is a group, not a page: `buildNavEntries()` gives it `basePath:
"/accounts"` and two leaves, **Users** (`/users`) and **Operators**
(`/operators`). There is no `/accounts` route. Both leaves are 20-line wrappers
around the same component:

```tsx
// app/users/page.tsx                  // app/operators/page.tsx
<UserDirectory                         <UserDirectory
  roles={["Admin", "Superadmin"]}        roles={["Operator"]}
  title="Users"                          title="Operators"
  tableHeading="Platform users"          tableHeading="Operator accounts"
  createLabel="Create user"              createLabel="Create operator"
  lockLineToActive showShippingLine />   showStatusFilter={false} … />
```

Sources transcribed:

| File | What comes from it |
| --- | --- |
| `components/UserDirectory.tsx` | toolbar, table, row menu, empty state, both pages |
| `components/UserFormModal.tsx` | create/edit dialog, `Field`, `PasswordInput`, the segmented Status control |
| `components/UserStatusDialog.tsx` | the suspend / reactivate confirms |
| `components/PageHeader.tsx` | title + subtitle chip + Export + the CTA slot |
| `components/Pagination.tsx` | the footer, `buildPageList()` verbatim, `PAGE_SIZE_OPTIONS` |
| `components/RowMenu.tsx` | `w-52` menu, the `TONE` lookup, the up-flip |
| `components/Sidebar.tsx` | the Accounts group's two leaves and their icons |
| `lib/users-data.ts` | `roleLabel` / `roleTone` / `userStatusTone`, and **every seed row** |

## Install

Figma → **Plugins → Development → Import plugin from manifest…** → pick
`figma-plugin-accounts/manifest.json`. The plugin id is
`tripket-accounts-allstates`, so it installs alongside the routes / vessels /
bookings / tickets / shipping-lines / reports plugins.

It creates (or reuses) a section named **`Accounts — All states`** below every
existing section on the page, laid out **4 frames per row** at 1440×900.

**Additive**: a frame whose name already exists in the section is skipped, never
replaced. It reports e.g. `Added 3 frames · kept 17 existing`. To refresh one
frame, delete that frame and re-run.

> **If you add a frame to `BUILDERS` later, append it at the END of the array.**
> Grid position derives from the array index, so inserting in the middle shifts
> every later frame onto an occupied slot.

## The 20 frames

**Users** — `/users`, roles Admin + Superadmin, 8 seeded rows

| # | Frame | State |
| --- | --- | --- |
| 01 | Directory | all 8 rows; Role, Shipping line, Status, Last active |
| 02 | Loading skeleton | `<TableSkeleton rows={10} />` while the store loads |
| 03 | Row menu open | Edit user + Suspend (danger) |
| 04 | Role filter open | portaled `Select` menu over the card |
| 05 | Status filter open | All status / Active / Suspended |
| 06 | Search "aquino" | filters `name + email` to Liza and Carla Aquino |
| 07 | No users match | the `py-12` empty cell |
| 08 | Per page open — 12 matches no option | see finding 1 |

**Operators** — `/operators`, role Operator, 28 seeded rows, no filters at all

| # | Frame | State |
| --- | --- | --- |
| 01 | Directory — Page 1 of 3 | 12 rows; the pager falls below the fold |
| 02 | Scrolled to pager — Page 2 of 3 | Previous / 1 2 3 / Next, page 2 active |
| 03 | Row menu — Reactivate | on Ada Flores, the one suspended row on page 1 |
| 04 | No operators match | empty state with the operator noun |

**Dialogs**

| # | Frame | State |
| --- | --- | --- |
| Create user 01 | Empty form | CTA disabled at 60% |
| Create user 02 | Validation errors | all four messages, rose-toned inputs |
| Create user 03 | Filled — Password revealed | eye-off on Password, Confirm still masked |
| Create user 04 | Role select open | Super Admin / Admin, the only two options |
| Edit user 01 | Prefilled + Status control | no password fields, Role + Status side by side |
| Create operator 01 | No Role field | see findings 3 and 5 |
| Status 01 | Suspend this user? | rose mark, "Mae Dela Cruz … **Suspended**" |
| Status 02 | Reactivate this operator? | emerald mark, "Ada Flores … **Active**" |

## Seed data is literal, not representative

`buildUsers()` is deterministic — FNV-1a over each line id — so I ran it to
completion and transcribed the output. These are the exact 36 accounts the app
seeds (2 platform Super Admins + 3–6 per line), split 8 / 28 across the two
pages, in source order. Same tier as the routes and vessels plugins; unlike the
bookings and tickets seeds, nothing here is a stand-in.

The one thing that isn't reproducible is `relativeTime()`, which is computed
against `Date.now()`. The offsets are fixed, the wall clock isn't, so "8d ago"
is correct relative to load.

## Measurements

`globals.css` sets `html { font-size: 17px }`: `px-5` → 21.25, `py-3.5` →
14.875, `py-2.5` → 10.625, `gap-3` → 12.75, `h-8` → 34, `w-32` → 136, `w-48` →
204. Literal px classes don't scale: `min-w-[640px]`, `min-w-[28px]` on the page
chips, `h-7`/`w-7` are rem so they do.

Derived row geometry: `A_ROW_H` = 14.875 × 2 + max(34 avatar, 21 name + 18.75
email) = **69.5**; thead **40.25**; toolbar **72.06**; pager **56.25**. Column
widths are computed from measured content the way `table-auto` sizes them, with
the User column absorbing the slack.

## Things I found in the source — flagged, not fixed

1. **The "Per page" control renders empty on both pages.** `UserDirectory` sets
   `DEFAULT_PAGE_SIZE = 12`, but `Pagination` offers
   `PAGE_SIZE_OPTIONS = [10, 25, 50, 100]`. A native `<select>` whose `value`
   matches no `<option>` displays **blank** — so the directory opens with an
   unlabelled selector, and the first interaction silently changes the page size
   away from 12. Frame *Users / 08* draws it exactly: empty trigger, four
   options, none highlighted. Either add `12` to the options or default to `10`.
2. **The Shipping line column shows the wrong line.** It renders
   `lineForUser(u.id)` — a second FNV hash of the user id into `lines[]` — not
   `u.lineId`, which is the line the account actually belongs to and the one the
   create dialog assigns. **5 of the 8 seeded users display a different line than
   they are on** (Ella Castillo is on `2go` and shows Weesam Express; Mika
   Bautista is on `weesam` and shows FastCat). The comment calls it "the line
   each admin is currently on", but nothing tracks that anywhere.
3. **The row menu says "Edit user" on the Operators page.** `entityNoun` is
   threaded through the CTA, the dialog title, the subtitle and the status
   dialog — but the `RowMenu` item label is the hard-coded string `"Edit user"`.
   It's the one place the operator wording didn't reach.
4. **"Add a operator".** `Add a ${entityNoun} and assign them to the current
   shipping line.` has no article handling, so the Operators create dialog opens
   with a grammatical error. Frame *Create operator / 01* shows it.
5. **Create operator leaves 17px of dead space.** When `entityNoun ===
   "operator"` and it isn't an edit, the `grid grid-cols-2 gap-3` wrapper renders
   with **zero children** — but it's still a `space-y-4` sibling, so it
   contributes a 17px top margin above nothing, between Confirm Password and the
   footer. Guard the wrapper on `showRole || isEdit`.
6. **No shipping-line field exists, despite the promise.** `lockLineToActive`'s
   own doc comment says "the create dialog shows the line read-only instead of a
   picker" — there is no line control in `UserFormModal` at all, read-only or
   otherwise. `draft.lineId` is silently set to `lockedLineId ?? lines[0].id`,
   and `valid` even gates on it being non-empty. The subtitle tells the admin
   they're assigning a shipping line; the form never shows which.
7. **The Role filter's labels don't match the table's.** Options come from
   `roles.map(r => ({ value: r, label: r }))` — the raw values — so the dropdown
   reads "Superadmin" while every row chip reads "SUPER ADMIN" via `roleLabel`.
   Same value, two spellings, side by side.
8. **Export is inert on every page.** `PageHeader` renders the Export button
   whenever `showExport` is true (the default) with no `onClick` and no handler
   prop anywhere. `UserDirectory` disables the date filter but leaves Export on,
   so both directories ship a control that does nothing. Drawn in the frames
   because that's what the page renders.
9. **The Users page can never reach "Reactivate" on first load.** The seed marks
   a user suspended when `r % 9 === 0`, and none of the 8 Admin/Superadmin
   accounts hits it — so the Status filter has nothing to filter to and the row
   menu's success-tone item is unreachable until someone suspends an account by
   hand. That's why frame *Operators / 03* carries the Reactivate state.
10. **Passwords are collected and then dropped, by design.** `handleSubmit`
    destructures `const { password: _password, ...fields } = draft` with a
    comment explaining that a credential has no business in `localStorage`.
    Worth knowing that the Password and Confirm fields — both required, both
    validated — currently feed nothing.

## Fidelity notes — where I did not transcribe literally

- **The chassis sidebar was stale for this module.** The shared `NAV` table lists
  Accounts as a group with no children. `buildNavEntries()` gives it two leaves,
  so this plugin rebuilds that part of the sidebar: the group is expanded, both
  leaves render with their real icons, and the **leaf** is the active item — not
  the group. Every other plugin's sidebar still shows the old shape; worth
  syncing the chassis when one of them is next touched.
- **Only 2GO's logo is embedded.** The shipping-line column falls back to
  initials on each line's `fallbackTint` for the other six; in the app all seven
  render real bitmaps from `/public/imgs`.
- **The nav is role-aware.** Accounts and Activity logs are admin-only; these
  frames show the admin sidebar. The operator-scoped nav isn't drawn.
- **Row hover affordances are omitted** — the 3px brand-500 left bar that scales
  in on `group-hover`, and the `hover:bg-slate-50/60` row tint. None of these
  frames is a hover state.
- **`motion.tr` entrance stagger is not drawn** (opacity/y transition per row).

## Verification

`node --check` plus a stubbed-Figma smoke harness (`smoke-accounts.js`) runs all
20 builders outside Figma and checks reference errors, node counts, duplicate
frame names, `setRangeFills` / `setRangeFontName` range validity, dialog height
against the 810px `max-h-[90vh]` cap, frames overflowing 1440×900, and NaN
geometry. All 20 build clean. Layout was additionally eyeballed by rendering the
built node tree to SVG (`render-accounts.js`) — that pass caught the "Per page"
popup running off the bottom of the frame, which now flips upward the way a
native select does.
