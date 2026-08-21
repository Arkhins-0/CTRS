# F1.com 2026 Homepage — Main Content Design Spec

Scope: everything inside `<main>` (header nav and footer covered elsewhere).
Source: saved formula1.com homepage (2026 redesign), verified against its compiled CSS.

---

## 0. Global design system (applies to all sections)

### 0.1 Fonts

| Family | Weights used | Role |
|---|---|---|
| `Formula1` | 400 (Regular), 500 (Bold file), 900 (Black file) | "display" roles: headlines, card titles, section headings |
| `Titillium Web` | 400 / 600 / 700 | "body" roles: card blurb titles, buttons, tags, table text |
| `KH Interference F1` | 700 | "technical" roles: big numerals (standings position, points) |

All type roles ship `letter-spacing: 0`. Uppercase is applied via a utility class
(`text-transform: uppercase`), not baked into strings.

### 0.2 Type scale (exact compiled values)

Display (Formula1):

| Role | font |
|---|---|
| display-s-regular | 400 12px/16px |
| display-m-regular / -bold | 400·500 16px/22px |
| display-l-regular / -bold | 400·500 20px/24px |
| display-xl-regular / -black | 400·900 24px/28px |
| display-2xl-regular / -black | 400·900 32px/38px |
| display-3xl-black | 900 40px/44px |

Body (Titillium Web):

| Role | font |
|---|---|
| body-2xs-regular / -semibold / -bold | 400·600·700 12px/16px |
| body-xs-regular / -semibold / -bold | 400·600·700 14px/16px |
| body-s-compact-regular / -semibold | 400·600 16px/20px |
| body-s-semibold | 600 16px/24px |
| body-m-compact-regular / -semibold / -bold | 400·600·700 17px/24px |
| body-l-regular | 400 20px/32px |

Technical (KH Interference F1, all 700, line-height = size):

| Role | size |
|---|---|
| technical-xs-bold | 12px |
| technical-xl-bold | 24px |
| technical-2xl-bold | 28px |

Responsive type = same roles re-declared at breakpoints (`md_`/`lg_`/`xl_` prefixes),
e.g. a title can be m-regular base → l-regular ≥735 → xl-regular ≥1069.

### 0.3 Breakpoints

Media-query breakpoints (viewport): **md = 735px, lg = 1069px, xl = 1696px**.
Additionally the page root is a CSS container named `page`; many grids use
**container queries** at: 408, 640, 735, 856, 1032, 1069, 1280 px. In Tailwind v4
recreate with `@container/page` + arbitrary variants, or just map them to media queries.

### 0.4 Page container ("Container" component)

Every section = full-width band (background color runs edge-to-edge) with a centered inner:

```
inner margins:  24px each side          (base)
                32px each side          (≥735px)
                48px each side          (≥1069px)
                width: 1600px, centered (≥1696px)
```

A `fluid` variant zeroes the inner margins (used by carousel sections so the rail
can bleed to the viewport edge; headers inside re-apply a normal Container).

### 0.5 Color tokens

Static scale (never theme-flips):
`static-1 #ffffff · static-2 #f7f4f1 · static-3 #e0dedc · static-4 #cdcdcd · static-5 #aaaaaa · static-6 #606066 · static-7 #47464c · static-8 #303037 · static-9 #1c1c25 · static-10 #15151e · static-11 #000000`

Semantic tokens — LIGHT theme (default) / DARK theme (`.f1rd-dark` class on section):

| Token | Light | Dark |
|---|---|---|
| surface-neutral-1 | #fff | #000 |
| surface-neutral-2 | #f3f3f4 | #26262b |
| surface-neutral-3 | #f7f4f1 | #15151e |
| surface-neutral-4 | #e0dedc | #303037 |
| surface-neutral-5 | #cdcdcd | #47464c |
| surface-neutral-6 | #aaa | #606066 |
| surface-neutral-7 | #606066 | #aaa |
| surface-neutral-8 | #47464c | #cdcdcd |
| surface-neutral-9 | #303037 | #e0dedc |
| surface-neutral-10 | #15151e | #f7f4f1 |
| surface-neutral-11 | #000 | #fff |
| text-1 | #fff | #000 |
| text-2 | #f7f4f1 | #15151e |
| text-3 | #606066 | #aaa |
| text-4 | #1c1c25 | #fff |
| text-5 | #000 | #fff |

Brand/accents: **F1 red #e10600** (hover-dark #ca0500) · Live blue **#0076cc**
(pulse dot ring #4098d9) · Breaking yellow **#ffd100** (text #000) ·
negative #e91711 · positive #1a8930.

Dark sections are implemented by adding `f1rd-dark` to the section wrapper +
`background: #15151e` (static-10) + text token `text-4` (=white in dark).

### 0.6 Radii, borders, misc

- Radius scale: **s = 4px, m = 8px, l = 16px**; pills/buttons/chips = 1000px.
- Border widths: thin = 1px, medium = 2px.
- Spacing utilities are literal px (`gap-px-16` = 16px etc.).
- Universal image hover: `img { transition: transform .3s } card:hover img { transform: scale(1.1) }` with the image box `overflow: hidden`.
- Focus ring everywhere: `outline: 2px solid surface-neutral-11; outline-offset: 2px`.

---

## Section order (top → bottom of `<main>`)

| # | Section | Background | Theme |
|---|---|---|---|
| 1 | Hero block (chips row + hero grid + more-news list) | #15151e | dark |
| 2 | Ad slot (728×90 leaderboard) | #15151e | dark |
| 3 | "MUST WATCH" video rail | #15151e (token surface-neutral-3 in dark) | dark |
| 4 | "EDITOR'S PICKS" article grid + ad slot | #fff (surface-neutral-1) | light |
| 5 | "2026 Season" standings bundle (tabs + podium + table) | #fff | light |
| 6 | "2026 HIGHLIGHTS" video rail with giant logo watermark | #15151e | dark |

No countdown/next-race, app-promo, or schedule module exists in this capture — the body
is exactly these six bands. Adjacent dark bands read as one continuous dark region from
the page top through the MUST WATCH rail, then a hard switch to white.

```
┌────────────────────────────────────────────────┐ #15151e
│ (chips)(chips)(chips)(chips)(chips) →scroll    │
│ ┌───────────────────┐ ┌────┐┌────┐  ─ thumb ▪  │
│ │                   │ │feat││feat│  ─ thumb ▪  │
│ │   HERO (gradient) │ └────┘└────┘  ─ thumb ▪  │
│ │   ● LIVE          │ ┌────┐┌────┐  ─ thumb ▪  │
│ │   Headline……      │ │feat││feat│             │
│ └───────────────────┘ └────┘└────┘             │
│                [ 728×90 ad ]                   │
│ MUST WATCH                    View All  ‹  ›   │
│ ▶[video][video][video][video][video][str/ipe]  │
│ ━━━━━━──────────────────────────  (progress)   │
├────────────────────────────────────────────────┤ #ffffff
│ EDITOR'S PICKS                                 │
│ ┌───────wide overlay───────┐ ┌stack┐ ┌stack┐   │
│ └──────────────────────────┘ └─────┘ └─────┘   │
│ ┌stack┐ ┌stack┐ ┌───────wide overlay───────┐   │
│ └─────┘ └─────┘ └──────────────────────────┘   │
│                [ 728×90 ad ]                   │
│ ⟋⟋ 2026 SEASON                                 │
│ ┌ DRIVERS ─ TEAMS ┐  (sticky tab bar)          │
│ ┌──2nd──┐ ┌──1st(tall)──┐ ┌──3rd──┐  (podium)  │
│ │ Pos Driver Nationality Team   Pts │ (table)  │
│ │        [ Show all ⌄ ]             │          │
│            [ View full standings ]             │
├────────────────────────────────────────────────┤ #15151e
│ 2026 HIGHLIGHTS               View All  ‹  ›   │
│ [video][video][video][video][video]  (F1 ⍉ wm) │
│ ━━━━━━──────────────────────────  (progress)   │
└────────────────────────────────────────────────┘
```

---

## 1. Hero block

Wrapper: dark Container (`#15151e`, white text) → inner → column,
**padding-block 16px (24px ≥735)**, **gap 16px (24px ≥735)**.

### 1.1 Quick-link chips row

- Horizontally scrollable strip, scrollbar hidden, 4px padding (room for focus ring).
- `ul` flex, **gap 16px**; items `whitespace-nowrap shrink-0`.
- 7 chips, each: icon (16×16 `currentColor` svg) + label. Labels e.g. "News",
  "Videos", "Live Timing", "Fantasy", "Gaming", "New to F1?", "F1 Awards".

Chip anatomy (`<a>`):
- pill `border-radius: 1000px`, **padding 8px 12px**
- background `rgb(neutral-11 / .10)` → in dark = white @10%
- hover: `rgb(neutral-11 / .20)`
- active (pressed): `box-shadow: inset 3px 2px 6px #000` + inner nudged 1px right/down
- selected variant: solid neutral-11 bg + text-1 color
- inner: inline-flex, gap 4px, align center
- label: **body-xs-bold — Titillium 700 14px/16px** (no uppercase)

### 1.2 Hero grid

Outer grid: `grid-cols-1` → **`[4fr 1fr]` @≥1280** (left = hero cluster, right = more-news
list). Gap **16px (24px ≥735)**.

Left cluster grid: `grid-cols-1` → **`[minmax(0,1.5fr) 1fr]` @≥856** →
**`[minmax(0,1.7fr) 1fr]` @≥1280**; same gaps. Left cell = hero card, right cell =
featured 4-pack.

#### Hero card (lead story / live)

```
<div card hero>                       position:relative, radius 8px, overflow clip, bg surface-1
  <span image>  <img>                 absolute inset-0 (z10), object-cover
  <span TextGradientCaption bottom>   z20, grid rows [1fr 2fr]  (caption occupies row 2)
    <span gradient>                   rows 1-3: linear-gradient(180deg,
                                        black/0 → black/.54 → black/.87 → black/1)
    <span blur>                       rows 1-3: backdrop layer masked
                                        linear-gradient(180deg, transparent → black)
    <span child bottom>               row 2: content wrapper
      <span content>                  flex col, justify-end, gap 8px, color #fff
                                        padding 0 16px 16px  (0 24px 24px ≥735;
                                        back to 0 16px 16px ≥1069; 0 24 24 ≥1696)
        <span><Tag/></span>           optional status tag
        <a title>                     stretched link (before: inset-0)
```

- Fixed heights: **260px → 334 (@640) → 378 (@735) → 460 (@856) → 476 (@1069) → 486 (@1280)** (container-query widths).
- Title: **Formula1 400 — 16/22 → 20/24 (≥735) → 24/28 (≥1069)**, white; sentence case.
- Hover: image scale(1.1) 300ms + title underline. Whole card clickable via
  stretched pseudo-element on the title anchor.
- Gradient caption uses `--f1rd-tg-colour: black` (make it a CSS var so other surfaces
  can tint it).

Tag component (used here and in card grids):
- small size: **padding 2px 4px, radius 2px**; medium: 4px 8px, radius 4px
- text **Titillium 700 12px/16px, UPPERCASE**, inner flex gap 4px
- variants: `live` bg #0076cc/#fff (+ pulsing dot), `unlocked` bg #e10600/#fff
  (hover #ca0500), `breaking` bg #ffd100/#000
- LiveDot: 1em dot in currentColor; `:before` 2.5em ring bg #4098d9,
  `animation: pulse 1.25s cubic-bezier(.215,.61,.355,1) infinite`
  (keyframes: 0% scale(.33); 80%,100% opacity 0).

#### Featured 4-pack

Grid: **2 cols → 4 cols (@640) → 2 cols (@856)**; gap **8px (16px ≥735)**; `auto-rows-max`.

Featured card anatomy (transparent, no surface):
- column flex, **gap 8px**, radius 0, overflow visible, min-height 180 → 198 (≥1069) → 224 (≥1696)
- image box: **height 120px → 82 (≥735) → 126 (≥1069)**, radius 8px, overflow clip,
  img object-cover (≈16:9 crop)
- title below image: **Titillium 600 14/16 → 16/20 (≥735)**, current text color (white here)
- hover: image scale(1.1) + title underline

### 1.3 "More news" list (right rail)

Grid: **1 col → 2 (@640) → 4 (@856) → 1 (@1280)**, gap 8px (16px ≥735), auto-rows-max.

Row anatomy:
- flex, **gap 8px (12px ≥1069)**; at ≥1280 `flex-row-reverse` (thumb moves to the right)
- **top border 1px** in neutral-5 (dark: #47464c), padding-top 8px (12px ≥1280)
- min-height 48 → 72 (@856) → 60 (@1069) → 98 (@1280)
- thumb: **48×48px**, radius 4px, overflow hidden, img object-cover,
  hover scale(1.1) 300ms (group hover)
- text link: flex col, gap 4px (8 ≥1069); stretched-link pseudo overlay
- title: **Titillium 600 14/16 → 16/20 (≥735)**, hover underline

---

## 2. Ad slot

Dark Container, same padding as hero (py 16/24). Inner: centered block,
`text-center`, contains a 728×90 iframe. Recreate as a fixed-height centered
placeholder; hide on small screens if desired (site lets it overflow-hidden).
A second identical slot ends section 4 (light background).

---

## 3. "MUST WATCH" video rail (dark)

Band: dark Container, bg = surface-neutral-3 token (dark: **#15151e**), **fluid**
inner. Column, **padding-block 16px (24 ≥735)**, **gap 32px** between
(header+rail) and progress bar; header+rail sub-group gap **16px (24 ≥1069)**.

### 3.1 Rail header (inside normal page container)

```
flex justify-between items-center, gap 16px
├─ h2: "MUST WATCH" — Formula1 900 24/28 → 32/38 (≥1069), UPPERCASE
└─ right cluster: flex gap 16px items-center
   ├─ "View All" link-ghost button:
   │    Titillium 700 17/24, transparent bg, text-5 (white)
   │    below-label underline element: h 4px, transparent;
   │    hover: red (#e10600) bar animates width 0 → 100% (.3s)
   └─ prev/next icon buttons: flex gap 8px
        32×32 chevron svgs (1em @ 2rem), transparent pill,
        hover bg neutral-11/10%, disabled opacity 50%
```

### 3.2 Carousel row

- Scroll container: `overflow-x: scroll`, scroll-snap x mandatory, scrollbar hidden,
  4px padding-block; **padding-inline = page margin** (24 → 32 ≥735 → 48 ≥1069 →
  `calc((100% - 1600px)/2)` ≥1696) so cards align with the page grid but bleed on scroll.
- Edge "more content" indicators: absolutely-positioned before/after strips, width =
  same padding, background = surface-neutral-3 @ 80% alpha (dark: rgba(21,21,30,.8)) —
  a fade hinting more cards on the right/left.
- Track: inline-flex, **gap 8px (base+md compact), 16px ≥1069**; each child snap-start.

### 3.3 Video card

Card link: `aspect-video`, fixed width **250px → 218 (≥735) → 314 (≥1069)**, shrink-0.

```
<a w-[250|218|314]>
  <div layout-card hover>
    <div relative>
      <div rounded-corners>           radius 8px, overflow clip
        image (16:9, object-cover)
        <span gradient>               absolute bottom, inset-x 0, padding 16px
                                      linear-gradient(180deg, transparent → #15151e)
          <div content-container>     flex col, gap 16px
            <div icon+duration>       flex justify-between items-end
              play chip:              circular, 2px solid #fff, bg rgba(0,0,0,.302),
                                      backdrop-filter blur(5px), padding 6px,
                                      16×16 play triangle, color #fff
              duration:               absolute right-0 bottom-0;
                                      Titillium 600 12/16 #fff,
                                      bg rgba(0,0,0,.4), radius 4px, padding 0 4px 1px
    <div content as-card>             padding 16px 0 32px (pb overridden to 0 in rail),
                                      max-width 80%, gap 12px (16px ≥735)
      <p title>                       Titillium 600 16/20 → 17/24 (≥735)
```

Hover: image scale(1.1) .3s + title underline.

### 3.4 End-of-rail filler ("ghost" block)

Last flex child after the cards: full remaining width, height **141px → 123 (≥735)
→ 177 (≥1069)**, opacity 40%, inner block radius 8px offset-left 8px (16 ≥1069) with
`background: repeating-linear-gradient(135deg, neutral-4, neutral-4 16px, transparent 16px, transparent 32px)` — diagonal candy-stripe placeholder.

### 3.5 Scroll progress bar

Inside normal page container, last child of the band:
- track: relative, full width; `:before` covers it with neutral-11 @ **10% opacity**
- fill: **height 2px**, bg neutral-11 @ **30% opacity**, `width: <scrolled%>`
  (updates with rail scroll; starts 0%)

---

## 4. "EDITOR'S PICKS" article grid (light)

Band: white Container (surface-neutral-1). Column, **padding-block 24px (32 ≥735)**,
gap 32px (grid group → ad). Heading+grid gap **16px (24 ≥1069)**.

- h2: "EDITOR'S PICKS" — **Formula1 900 24/28 → 32/38 (≥1069), UPPERCASE**, text dark.
- `ul` grid: **2 cols → 2 (md) → 4 (≥1069)**; **gap 8 → 16 (md) → 24 (lg)**; items stretch.
- 6 cards in pattern: **overlay(span 2), stacked, stacked, stacked, stacked, overlay(span 2)**
  (each overlay card spans 2 columns → on mobile they're full-width, stacked cards 2-up).

### Overlay card (wide)

Same anatomy as hero card (image + bottom gradient caption), plus:
- `constrained` heights: **234px → 504 (≥735) → 360 (≥1069) → 600 (≥1696)**
- background surface-neutral-3 (#f7f4f1) behind image while loading
- content padding identical to hero; optional Tag
- title: **Formula1 400 — 20/24 → 32/38 (≥735) → 20/24 (≥1069) → 32/38 (≥1696)**, white
- hover identical (img zoom + underline)

### Stacked card

- column card, radius 8px, overflow clip, **bg #f7f4f1** (surface-neutral-3)
- min-height **242 → 360 (≥735) → 600 (≥1696)**
- image box height **106 → 155 (≥735) → 293 (≥1696)**, img object-cover
- content: padding **8px (16px ≥735)**, gap 4 (8 ≥735; 16 ≥1696)
- optional small Tag (e.g. red "Unlocked")
- title: **Titillium 400 — 16/20 → 17/24 (≥735) → 20/32 (≥1696)**, text dark
- hover: img zoom + underline

Section ends with the second 728×90 ad slot (white background).

---

## 5. "2026 Season" standings bundle (light)

White Container, fluid inner; column, padding-block 24 (32 ≥735), gap 32.

### 5.1 Bundle header

Inside page container. Column, gap 16 (24 ≥1069):
- Decorative "racing line" SVG separator above the heading: full-width red
  (#e10600) chicane stripe graphic, **height 16px (24px ≥1069)**, left-oriented.
- h2 "2026 Season": **Formula1 900 32/38 → 40/44 (≥1069), UPPERCASE**.

### 5.2 Sticky tab bar

`position: sticky; top: <nav heights>`, z10, **bg white**, bottom border 2px
neutral-4 (#e0dedc). Inside page container:

- `role=tablist` grid `repeat(2, 1fr)` (equal-width tabs), items-end
- Tab button: **padding 8px 16px**, centered;
  selected: **Titillium 700 17/24, text #000**; unselected: 600 17/24, text #606066
  (hover swaps colors; unselected hover shows neutral-6 bottom border; selected hover
  hints hot-red-20 #f6b4b2)
- Track under tabs: full width, **height 2px**, bg #e0dedc; sliding indicator span
  bg **#e10600**, `transition: all .5s`, width/left animated to the active tab.
- Labels: "DRIVERS", "TEAMS".

### 5.3 Tab panel

Page container; column, **padding-block 48px (64 ≥1069)**, **gap 32 (48 ≥1069)**.

#### Podium cards (top-3)

Grid: **1 col → 2 cols @735 (leader spans both) → 3 cols @1032** with `items-end`
and visual order **2nd, 1st, 3rd** (1st has `order-2`, min-heights make it tallest —
a podium silhouette).

| Card | min-h base | min-h @1032 | mobile offset |
|---|---|---|---|
| 1st | 220px | 324px | none |
| 2nd | 140px | 300px | margin-left 24px (@408–735) |
| 3rd | 140px | 276px | margin-left 48px (@408–735) |

(On mobile the cards stack with increasing left indent — a stair-step effect.)

Card anatomy:
- relative, radius 8px, overflow hidden, `flex grow`, **bg = team "accessible colour"**
  (inline vars: e.g. `--f1-team-colour:#27f4d2; --f1-accessible-colour:#067e6a`;
  Ferrari #e8002d/#5c0012), text white (static-1)
- Two decorative **DRS pattern** layers: 326px-tall spans, mask-image = DRS chevron
  texture, `background-color: var(--f1-team-colour)`, one at left (opacity 1), one
  ending at center (opacity .3), vertically centered
- Sheen overlay: `linear-gradient(269.74deg, accessible/0 20.12%, accessible 99.7%)`
  over full card
- Driver cutout img: absolute; width **154px (1st) / 100px (others)** right 5%
  (right 15% @408+); ≥1032: **width 190px, left 40%, top 24px**
- Content column (z10): max-width 152px (72px ≥735, 50% ≥1069), padding **16px x /
  12px y**, gap 8px:
  - rank: `1` **KH Interference 700 28px** + ordinal `st` **12px** raised (margin-top 3px), 1px gap
  - name (link): **Formula1 400 20/24** first name + **500 20/24** surname; team name
    below **Formula1 400 12/16**, 2px gaps
  - country flag: circular 24×24, 2px white ring (hidden < 735px)
  - spacer (flex-grow)
  - points: **KH Interference 700 24px** value + **12px** "PTS" aligned to baseline, gap 4px
- Hover: whole card is a group — name underlines; stretched link covers card.

#### Standings table

Wrapper: white card **radius 8px**, padding **16px 24px → 16 32 (≥735) → 24 32 (≥1069)**,
relative; horizontal scroll area with x snap for narrow screens.

- Header row: **Titillium 600 14/16, UPPERCASE, color #606066 (text-3)**;
  thead bottom border **2px #aaa (neutral-6)**
- Columns: Pos. (flush-left) · Driver · Nationality · Team · Pts. (flush-right)
- Cells: **padding 16px 24px 16px 4px (right 48px ≥735)**; flush-left/right cells pad
  4px on their outer edge; body rows separated by **1px #e0dedc** bottom borders
- Body text: **Titillium 600 16/24, #000**
- Driver cell: flex gap 10px — avatar (20×20 circle, bg team colour, img top-anchored)
  + name; responsive name: "Kimi Antonelli" ≥1069 → surname only 735–1069 →
  3-letter code "ANT" <735. (Capture artifact: a 10px full-height red block is drawn
  via `after:` on this cell — looks like a leftover debug utility; omit it.)
- Nationality cell: circular flag 20×20 (2px ring, neutral bg) + country name, gap 10px
- Team cell: team logo chip 20×20 circle (bg team colour, 16×16 logo, 2px pad) + name
- 6 rows shown.
- Footer (inside card): padding-top 16 (24 ≥735); centered **"Show all" ghost button**
  — transparent pill, padding 8px 16px, **Titillium 700 14/16 → 17/24 (≥1069)** +
  16px chevron-down; hover bg neutral-11/10%.

Below the card, centered: **"View full standings"** stroke button —
pill radius, **2px solid #000 border**, transparent bg, padding 8px 16px,
**Titillium 700 14/16 → 17/24 (≥735)**; hover bg black/10%; press: inset shadow +
1px content nudge.

---

## 6. "2026 HIGHLIGHTS" video rail (dark, watermarked)

Band: dark Container (**#15151e**, white text), fluid inner, `overflow-clip`.

- Watermark: absolute, centered in band (`left 50%/top 50%, translate -50%`),
  **width 1521px → 1920px (≥735)**, **opacity 5%**, giant F1 "chicane/flag" line-art
  SVG (viewBox 604×604) filled white (static-1). Sits at z10 under content (z20).
- Content column: padding-block 24 (32 ≥735), gap 32 — **identical structure to
  section 3**: header (h2 "2026 HIGHLIGHTS" display-xl-black→2xl uppercase +
  View All + arrows) → carousel row (same card spec, same paddings/fades) →
  striped ghost filler → 2px scroll progress bar.

---

## Implementation notes for the Tailwind v4 rebuild

1. Model each band as `<section class="band [dark]">` where `.dark` swaps the token
   set (CSS vars above) — sections 1–3 & 6 dark, 4–5 light.
2. Register fonts: Formula1 (400/500/900), Titillium Web (400/600/700), plus a
   condensed mono-ish display for "technical" numerals (KH Interference F1 —
   substitute any squarish bold face or reuse Formula1 500 if unavailable).
3. The `/page` container queries can be flattened to the nearest standard
   breakpoints (640→sm-ish, 735→md, 856/1032→lg-ish, 1280→xl) with minimal visual
   drift; heights of hero/overlay cards are explicit px, not aspect ratios — keep them.
4. Aspect ratios: hero/overlay cards ≈4:3 when unconstrained (`aspect-ratio:1.333`)
   but constrained heights win; video thumbs and stacked/featured card imagery are
   16:9 (`aspect-video`, `aspect-ratio:1.7778`) with object-cover.
5. Reusable pieces: Tag, LiveDot, Chip, Button (stroke / ghost / link-ghost),
   IconButton (transparent), TextGradientCaption, CarouselRow (+fade indicators +
   progress bar), DynamicArticleCard (hero / overlay / stacked / featured variants),
   VideoMediaCard, Table, TeamLogo, DriverAvatar, CountryFlag, RacingLine, DRSPattern.
