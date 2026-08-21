# DESIGN SPEC — Results/Standings Hub (formula1.com 2026 redesign)

Scope: main content of (1) Drivers' Standings, (2) Season Race Results list, (3) Single Grand Prix Race Result.
Global header/footer excluded. All values extracted from the saved pages' DOM + CSS
(`665955b2b99a4cdd_*.css` = component modules, `644cc6d260920ee1_*.css` = Tailwind utilities, `fonts_*.css` = @font-face).

---

## 1. Foundations

### 1.1 Breakpoints (mobile-first)
| Name | Media query | Notes |
|------|-------------|-------|
| base | < 735px | mobile |
| `md` | `(min-width: 735px)` | tablet |
| `lg` | `(min-width: 1069px)` | desktop |
| `xl` | `(min-width: 1696px)` | wide — content rail fixes at 1600px centered |
| floor | `(max-width: 360px)` | container clamps to `width: 360px` (no smaller) |

### 1.2 Color tokens (light theme; dark theme swaps as listed)
| Token | Light | Dark | Used for |
|---|---|---|---|
| surface-neutral-1 | `#fff` | `#000` | table card bg, top strip bg |
| surface-neutral-2 | `#f3f3f4` | `#26262b` | — |
| surface-neutral-3 | `#f7f4f1` (warm beige) | `#15151e` | page background, dropdown menu bg |
| surface-neutral-4 | `#e0dedc` | `#303037` | row dividers, inactive tab underline, hairlines |
| surface-neutral-5 | `#cdcdcd` | `#47464c` | — |
| surface-neutral-6 | `#aaa` | `#606066` | thead bottom border, inactive tab hover underline |
| surface-neutral-10 | `#15151e` | `#f7f4f1` | "active" status dot in dropdowns |
| surface-neutral-11 | `#000` | `#fff` | focus outlines, hover overlays (at 10% alpha) |
| text-1 | `#fff` | `#000` | — |
| text-3 | `#606066` | `#aaa` | thead text, inactive tab text, meta text |
| text-5 | `#000` | `#fff` | body cell text, active tab, buttons |
| button-primary-default | `#e10600` (F1 red) | same | active tab underline, focus ring on active tab |
| accent-hot-red-20 | `#f6b4b2` | `#710e10` | active tab underline on hover |
| button-secondary-default | `#000` | `#fff` | stroke-button border |
| brand-shift-green | `#71cc98` | same | latent `before:` class on title band (does not render — see 2.4) |

Team accent colors (inline `background-color` on avatar/logo chips; use own palette):
Mercedes `#27f4d2` · Ferrari `#e8002d` · McLaren `#ff8000` · Red Bull `#3671c6` ·
Racing Bulls `#6692ff` · Alpine `#00a1e8` · Haas `#dee1e2` · Audi `#ff2d00` ·
Williams `#1868db` · Aston Martin `#229971` · Cadillac `#aaaaad`.

### 1.3 Typography roles (from `typography-module_*`)
All `letter-spacing: 0`. Two families: **Formula1** (display; weight 400 = Regular file, 500 = Bold file, 900 = Black file) and **Titillium Web** (body; 300/400/600/700).

| Role | font shorthand | px | Case | Used for |
|---|---|---|---|---|
| display-2xl-bold | `500 2rem/2.375rem Formula1` | 32/38 | UPPER | H1 at ≥1069px |
| display-xl-bold | `500 1.5rem/1.75rem Formula1` | 24/28 | UPPER | H1 base |
| display-s-bold | `500 .75rem/1rem Formula1` | 12/16 | UPPER | race date range line |
| body-m-compact-bold | `700 1.0625rem/1.5rem Titillium Web` | 17/24 | — | filter (stroke) buttons, active tab |
| body-m-compact-semibold | `600 1.0625rem/1.5rem Titillium Web` | 17/24 | — | inactive tab labels |
| body-s-semibold | `600 1rem/1.5rem Titillium Web` | 16/24 | — | ALL table body cells, dropdown items |
| body-xs-bold | `700 .875rem/1rem Titillium Web` | 14/16 | — | season-year (ghost) dropdown button |
| body-xs-semibold | `600 .875rem/1rem Titillium Web` | 14/16 | UPPER (via thead) | table column headers; circuit/location line |

No monospace/tabular digits anywhere — times like `1:23:06.801` are plain Titillium 600 16px.

### 1.4 Page container primitive (`Container` module)
```
.container { display:block; width:100%; }            (@max 360px: width:360px)
.inner     { margin-inline: 24px }                    base
            { margin-inline: 32px }                   ≥735
            { margin-inline: 48px }                   ≥1069
            { width:1600px; margin-inline:auto }      ≥1696
```
Content width caps: text/H1 blocks additionally get `max-width: 973px` (`max-w-content-fixed-lg`).

---

## 2. Shared hub chrome (identical on all three pages)

### 2.1 Overall page skeleton
```
<main>                                     page bg = surface-neutral-3 (#f7f4f1)
 ├─ WHITE TOP STRIP  bg #fff, pt 16 (lg:24), children gap 32 (lg:48)
 │   ├─ [ad slot 728×90, centered, own container, pt 16 (lg:24)]   ← omit in rebuild
 │   └─ SEASON ROW + CATEGORY TAB BAR (container has border-b 1px #e0dedc)
 ├─ FILTER ROW SECTION   transparent (beige shows through), py 32 (lg:48)
 └─ TITLE + TABLE SECTION  pb 48 (lg:64), children stacked gap 16 (lg:24)
     ├─ H1 (+ sponsor logo on single-race page)
     ├─ meta container (empty on list pages; date+circuit on single race)
     └─ WHITE TABLE CARD
```

### 2.2 Season row + category tab bar
Row: `flex flex-wrap md:flex-nowrap items-center justify-around md:justify-start gap:16px`, inside a container whose bottom edge is a full-width hairline `1px solid #e0dedc`.

Left: **year dropdown button** (ghost variant, small):
- pill `border-radius:1000px`, no border, transparent bg, padding `8px 16px`
- label = year ("2026"), body-xs-bold 14/16, color `#000`, + chevron-down svg `1em`
- hover: overlay `rgb(0 0 0 / .1)`; active(press): `box-shadow: inset 3px 2px 6px #000`, inner content nudges 1px right/down
- `width:100%` below 735px (fullwidth variant)

Category nav — two renditions:
- **< 735px**: tab bar hidden; instead a second ghost dropdown button labeled with current category ("Drivers"), opening a menu of the 4 categories.
- **≥ 735px** (`hidden md:block`): horizontal tab nav.
  ```
  <nav style="grid-template-columns: repeat(4, 1fr)">   (equal-width tabs, -mb 1px to overlap hairline)
    RACES | DRIVERS | TEAMS | AWARDS
  ```
  Each tab: `display:block; padding: 8px 16px` (md: `8px 24px`), `text-align:center`, `transition-colors 500ms`.
  - inactive: text `#606066` body-m-compact-semibold; `border-bottom: 1px solid #e0dedc`; hover → text `#000`, border `#aaa`
  - active (`aria-current=true`): text `#000` body-m-compact-**bold**; `border-bottom: 2px solid #e10600`; hover → text `#606066`, border `#f6b4b2`
  - focus-visible: 2px outline, active tab uses `#e10600`, inactive `#000`
  The nav sits in a `sticky top-0 bg-white` wrapper (sticks only within the white strip).

### 2.3 Dropdown (shared primitive: year, category, race, session, driver filters)
Anatomy:
```
<div class="relative text-nowrap">
  <button>  (ghost-small or stroke-medium, see below)
  <dialog>  absolute, top:48px, margin-top:12px, z-30, left-aligned
    <menu>  border: 2px solid #000; border-radius: 8px; bg: #f7f4f1;
            max-height: 50vh; overflow-y: auto; flex column
      <li>  margin: 4px
        <a> padding: 8px; border-radius: 8px; border: 2px solid transparent;
            display:flex; gap:8px; align-items:center;
            body-s-semibold 16/24, color #000
            hover: ::after overlay inset-0, black @ 10% opacity
            focus: border-color #000
            current item ONLY: trailing status dot — 6px circle (0.375rem), fill #15151e
```
Two button skins:
- **ghost small** (season/category row): as in 2.2.
- **stroke medium** (filter row): transparent bg, `border: 2px solid #000`, pill radius 1000px, padding `10px 28px`, label body-m-compact-bold 17/24 `#000` + chevron `1em`, gap `.25rem`; hover overlay black @10%; fullwidth <735px.

### 2.4 Title band (H1)
- Wrapper: `flex justify-between items-start gap:24px` (stacks to column below tablet width — class `max-tablet:flex-col`; this utility has no CSS in the capture, intent = column under ~735px).
- H1: display-xl-bold 24/28 → ≥1069px display-2xl-bold 32/38; UPPERCASE; `max-width: 973px`; color `#000`.
- The band's parent has `relative before:bg-brand-shift-green` — the `::before` never renders (no `content` set anywhere); ignore or treat as vestigial.
- **Single-race page only**: right side of the band holds the race sponsor logo, `80×64px` box, `object-contain`, with light/dark image variants (`visibility` toggled via theme vars).

### 2.5 The white table card (shared results-table primitive)
Two nested wrappers, paddings **add up**:
```
outer card  : bg #fff; border-radius 8px; padding 24px 16px→(md) 32px 24px→ actually:
              px 24 / py 16   base    → px 32 / py 24  at ≥735 (md)
inner  .table-wrapper (id=results-table):
              bg #fff; border-radius 8px; overflow hidden;
              padding 16px 24px → 16px 32px (≥735) → 24px 32px (≥1069)
  .scrollable-area : overflow-x auto; scroll-snap-type: x mandatory
    <table> width:100%
```
Effective inset from card edge to table ≈ 48px/32px base, 64px/40–48px at md+. (Recreate either literally or collapse to one wrapper with the combined padding — visually a white rounded card with generous padding on the beige page.)

**Table skeleton (all three pages identical):**
- `<thead>`: `border-bottom: 2px solid #aaa`; text `#606066`; `text-transform: uppercase`; th = body-xs-semibold 14/16, `text-align:left`, `vertical-align: top`, `white-space: nowrap`.
- Cell padding (th and td identical): `16px 24px 16px 4px` base → `16px 48px 16px 4px` ≥735px. First column adds `flush-left` (padding-left 4px); last column `flush-right` (`text-align:right; padding-right:4px`).
  → body row height = 24px line + 32px padding = **56px**; header row = 16 + 32 = **48px**.
- `<tbody>`: color `#000`; every row except the last: cells get `border-bottom: 1px solid #e0dedc`.
- **No row hover, no zebra striping.**
- Numbers right-flush only in the final column (Pts./Time); all other cells left-aligned.
- Mobile overflow: table scrolls horizontally inside the card; each th is a `snap-start` snap point with scroll-margins 24px (md 48px).

### 2.6 Person / team chips (shared cell primitives)
**Driver chip** (`flex`, gap 10px):
```
( avatar 20×20 )  First  Last          ≥1069px
(       20×20 )   Last                 735–1068px  (first name hidden: max-lg:hidden)
(       20×20 )   ANT                  <735px      (3-letter code only: md:hidden on last name)
```
- Avatar: 20×20 circle (`border-radius:50%`), `object-fit: cover; object-position: top`, background = **team color** (inline style). Source image is a tall full-body render (64×184 px, Cloudinary `c_lfill,w_64` — width-only crop keeping ~1:2.9 aspect), so the circle shows the helmet/head against the team-color disc. Fallback bg `#e0dedc`.
- Avatar size scale (module): sm 20, md 32, lg 40, xl 48 — tables use **sm**.
- Name spans carry a literal `&nbsp;` between first/last.
- Classes `after:block after:bg-[red] after:w-px-10 after:h-full` sit on the chip but the `::after` never renders (no `--tw-content` default in this build); ignore.
- On the standings page the whole chip is a link to the driver page; on race pages the winner chip is a plain span.

**Team chip** (`inline-flex`, gap 10px):
- Logo disc: 20×20 circle, background = team color (inline), `padding: 2px`, logo img 16×16 `object-fit: contain` (white logo art, 64×64 source). Scale: sm 20/16+2, md 32/24+4, lg 40/30+5, xl 48/36+6.
- Followed by team name text. Linked on standings page, plain on race pages.

**Country flag (svg component)**:
- Circular: `border-radius: 50%`, solid border acting as a ring.
- Sizes: xs 12/1px · sm 16/1px · md 20/2px · lg 24/2px · xl 36/3px border.
- Variants: `neutral` = bg+border `#fff` (page surface), `white` = bg+border `#fff` explicit, `black` = `#000`.
- Race list rows use **md/neutral** (20px); the single-race filter row uses **xl/white** (36px).

---

## 3. Page 1 — DRIVERS' STANDINGS

Layout after shared chrome:

### 3.1 Filter row
One **stroke-medium dropdown**, label "All" — menu = "All" + one item per driver (23 items), active item shows the 6px dot. (Filters the table to a single driver.)

### 3.2 Table
```
| POS. | DRIVER                          | NATIONALITY | TEAM              | PTS.|
|  1   | (o) Kimi Antonelli              | ITA         | (o) Mercedes      | 219 |
|  2   | (o) Lewis Hamilton              | GBR         | (o) Ferrari       | 169 |
| ...  |                                 |             |                   |     |
```
- Columns: `Pos.` (flush-left) · `Driver` (driver chip, linked) · `Nationality` (3-letter code text) · `Team` (team chip, linked) · `Pts.` (flush-right, right-aligned).
- Position: plain number, body-s-semibold 16/24, black — **no badge/box**.
- Points: plain number, right-aligned — **no "pts" badge**; the unit lives only in the column header ("PTS.").
- **No top-3 special treatment** — every row identical.
- 22 rows, one per driver; the season dropdown (77 years) and category tabs above.
- Responsive: name → surname (md) → 3-letter code (<md); other columns rely on horizontal scroll + snap.

## 4. Page 2 — SEASON RACE RESULTS list

### 4.1 Filter row
One stroke-medium dropdown, label "All" — menu = "All" + one item per Grand Prix (24). Selecting a race navigates to that race result.

### 4.2 Table — one row per completed Grand Prix
```
| GRAND PRIX      | DATE   | WINNER              | TEAM          | LAPS | TIME        |
| (⊙) Australia   | 08 Mar | (o) George Russell  | (o) Mercedes  |  58  | 1:23:06.801 |
| (⊙) China       | 15 Mar | (o) Kimi Antonelli  | (o) Mercedes  |  56  | ...         |
```
- `Grand Prix` cell: link → race result; `flex gap:10px items-center`; **circular country flag 20px (md/neutral)** + country short name.
- `Date` = "08 Mar" (DD Mon).
- `Winner` = driver chip (identical primitive as standings, not linked).
- `Team` = team chip (not linked).
- `Laps` = number; `Time` = winner's total race time "1:23:06.801", final column flush-right.
- Same responsive name collapse; same 56px rows, dividers, snap scrolling.

## 5. Page 3 — SINGLE RACE RESULT

### 5.1 Filter row (differs)
```
[ Australia ▾ ]  [ Race Result ▾ ]                    (⊙ 36px country flag, right edge)
```
- Two stroke-medium dropdowns side by side (`flex md:flex-row gap:24px`; stacked column on <735px), row is `justify-between items-start md:items-center`:
  1. **Race selector** — "All" + 24 grands prix.
  2. **Session selector** — items: Practice 1, Practice 2, Practice 3, Qualifying, Starting Grid, Race Result, Fastest Laps, Pit Stop Summary (8 items; current = Race Result). This is the Race/Quali/Practice "tab" mechanism — it is a dropdown, not tabs.
- Right: country flag, **xl** (36px, 3px white ring).

### 5.2 Race header
- H1 band: full official race title, UPPERCASE (display-xl → 2xl-bold), with **sponsor logo 80×64** right-aligned (stacks under the title below tablet).
- Meta block (own container, `flex flex-col gap:6px`, color `#606066`):
  - line 1: date range "06 - 08 Mar 2026" — display-s-bold 12/16 Formula1, UPPERCASE
  - line 2: circuit + city — body-xs-semibold 14/16 Titillium
- The meta block occupies the container that is empty on the two list pages.

### 5.3 Classification table
```
| POS.| NO. | DRIVER               | TEAM            | LAPS | TIME / RETIRED | PTS.|
|  1  | 63  | (o) George Russell   | (o) Mercedes    |  58  | 1:23:06.801    | 25  |
|  2  | 12  | (o) Kimi Antonelli   | (o) Mercedes    |  58  | +2.974s        | 18  |
| ... |     |                      |                 |      | +1 lap         |  0  |
| NC  | 14  | (o) Fernando Alonso  | (o) AstonMartin |  21  | DNF            |  0  |
| NC  | 81  | (o) Oscar Piastri    | (o) McLaren     |   0  | DNS            |  0  |
```
- Columns: Pos. (flush-left) · No. (car number) · Driver chip · Team chip · Laps · Time / Retired · Pts. (flush-right).
- Winner shows absolute time; others `+2.974s` gaps; lapped cars `+1 lap`.
- **DNF/DNS display**: Pos. cell = `NC` (not classified), Laps keeps the count, Time/Retired cell = literal `DNF` / `DNS`, Pts = 0. **No color change, no icon** — same black 16px text.
- **No fastest-lap marker** in this table (fastest laps live on a separate Awards page).
- Chips are plain spans (not linked). All typography/border/padding identical to the shared primitive (§2.5–2.6).

---

## 6. Rebuild notes (Next.js 15 + Tailwind v4)

1. Define tokens as CSS vars mirroring §1.2; wire `md:735px lg:1069px xl:1696px` custom breakpoints and the 360px container floor.
2. Build 4 primitives: `ResultsTable` (thead/tbody styling of §2.5), `DriverChip`/`TeamChip`/`FlagRing` (§2.6), `PillDropdown` (§2.3, two skins), `CategoryTabs` (§2.2). All three pages are compositions of these under the shared skeleton (§2.1).
3. Use `<dialog>` or popover for the menus (template uses native `<dialog>` at `top:48px; mt:12px; z-30`).
4. Fonts: display font at weight 500 for all "bold" display roles (Formula1 Bold is mapped to weight 500); Titillium Web 600/700 for body. Titillium is on Google Fonts; substitute any squarish display face for Formula1.
5. Keep the double card padding or collapse it — target visual: white 8px-radius card, ~48–64px inner gutter, on `#f7f4f1` page.
6. Skip: ad slot, the non-rendering `after:bg-[red]` / `before:bg-brand-shift-green` classes, `--f1-nav-height` scroll-margin vars (define your own sticky-offset).
7. Dark mode: swap tokens per §1.2 table (page bg `#15151e`, card `#000`, dividers `#303037`, text `#fff`/`#aaa`).
```
Page skeleton, mobile (<735px)          Desktop (≥1069px)
┌──────────────────────────┐            ┌────────────────────────────────────────┐
│ [2026 ▾]   [Drivers ▾]   │ white      │ [2026 ▾]  RACES DRIVERS TEAMS AWARDS   │
├──────────────────────────┤ ── 1px ──  ├────────────────────────────────────────┤
│ [    All ▾  (full-w)   ] │ beige      │ [ All ▾ ]                              │
│                          │            │                                        │
│ 2026 DRIVERS'            │            │ 2026 DRIVERS' STANDINGS   (32px F1font)│
│ STANDINGS (24px)         │            │ ┌────────────────────────────────────┐ │
│ ┌──────────────────────┐ │            │ │ POS DRIVER  NATIONALITY  TEAM  PTS │ │
│ │POS DRIVER ...→scroll │ │            │ │ ───────────────2px #aaa─────────── │ │
│ │ 1  (o)ANT   ITA ...  │ │            │ │  1  (o)Kimi Antonelli ITA (o)M 219 │ │
│ └──────────────────────┘ │            │ │ ───────────────1px #e0dedc──────── │ │
└──────────────────────────┘            │ └────────────────────────────────────┘ │
                                        └────────────────────────────────────────┘
```
