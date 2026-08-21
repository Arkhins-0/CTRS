# F1.com 2026 — DRIVER & TEAM DETAIL PAGE SPEC

Source: saved formula1.com pages (Kimi Antonelli driver page; Mercedes team page), compiled CSS
`665955b2b99a4cdd.css` (components) + `644cc6d260920ee1.css` (tailwind utils) + `fonts.css`.
Scope: `<main>` only. All values measured from the compiled CSS, not eyeballed.

---

## 0. GLOBAL FOUNDATIONS (shared by both pages)

### 0.1 Breakpoints
| token | media query | note |
|---|---|---|
| base | < 735px | mobile |
| md | >= 735px | |
| lg | >= 1069px | |
| xl | >= 1696px | container becomes fixed 1600px |

### 0.2 Container primitive
```
.container { display:block; width:100% }            (min-width clamp: 360px)
.inner     { margin-inline: 24px }                  base
           { margin-inline: 32px }                  md
           { margin-inline: 48px }                  lg
           { width:1600px; margin-inline:auto }     xl
.inner.fluid { width:100%; margin-inline:0 }        (used by hero + carousels)
max-w-header = 1696px   (hero panel max width, centered)
```

### 0.3 Fonts
| family | file/weight map | usage |
|---|---|---|
| `Formula1` | Regular=400, **Bold=500**, Black=900 | display/headings/stat values |
| `Formula1Wide` | 500 | (not on these pages) |
| `Titillium Web` | 300/400/600/700 (+italics) | all body/label text |
| `Northwell Clean Alt` | 400 (script font) | driver FIRST name only |
NB: "Formula1 Bold" is registered at weight **500** — `font-weight:500 Formula1` = the Bold cut.

### 0.4 Type roles (exact `font:` shorthand values)
| role | spec |
|---|---|
| display-5-xl-black | 900 60px/60px Formula1 |
| display-4-xl-black | 900 48px/52px Formula1 |
| display-3-xl-black | 900 40px/44px Formula1 |
| display-2-xl-black | 900 32px/38px Formula1 |
| display-xl-black | 900 24px/28px Formula1 |
| display-xl-bold | 500 24px/28px Formula1 |
| display-l-bold | 500 20px/24px Formula1 |
| display-l-regular | 400 20px/24px Formula1 |
| custom-cursive-medium | 400 56px/1 "Northwell Clean Alt" |
| custom-cursive-large | 400 72px/1 "Northwell Clean Alt" |
| body-l-regular | 400 20px/32px Titillium Web |
| body-l-bold | 700 20px/32px Titillium Web |
| body-m-regular | 400 17px/28px Titillium Web |
| body-m-compact-semibold | 600 17px/24px Titillium Web |
| body-m-compact-bold | 700 17px/24px Titillium Web |
| body-s-regular | 400 16px/24px Titillium Web |
| body-s-bold | 700 16px/24px Titillium Web |
| body-s-compact-regular | 400 16px/20px Titillium Web |
| body-s-compact-semibold | 600 16px/20px Titillium Web |
| body-xs-semibold | 600 14px/16px Titillium Web |
| body-xs-bold | 700 14px/16px Titillium Web |
| body-2-xs-semibold | 600 12px/16px Titillium Web |
| body-2-xs-bold | 700 12px/16px Titillium Web |
All letter-spacing: 0. Headings additionally `text-transform: uppercase`.

### 0.5 Color tokens
Brand red: `#e10600` (racing-line separators, quote mark, link text, "Unlocked" tag).

Static (theme-independent):
| token | hex | used for |
|---|---|---|
| static-1 | #ffffff | text on hero / dark cards |
| static-5 | #aaaaaa | storyteller tile placeholder bg |
| static-8 | #303037 | "Career Stats"/"Team Summary" card bg |
| static-9 | #1c1c25 | dark section background (hero wrapper, Statistics, Drivers) |
| static-11 | #000000 | gallery caption overlay (80% opacity) |

Themed (light values — these pages run light theme except sections wrapped in `.f1rd-dark`):
| token | light | dark (`.f1rd-dark`) |
|---|---|---|
| surface-neutral-1 | #ffffff | #000000 |
| surface-neutral-2 | #f3f3f4 | #26262b |
| surface-neutral-3 | #f7f4f1 | #15151e |
| surface-neutral-4 | #e0dedc | #303037 |
| surface-neutral-5 | #cdcdcd | #47464c |
| surface-neutral-6 | #aaaaaa | #606066 |
| surface-neutral-11 | #000000 | #ffffff |
| text-3 (label/muted) | #606066 | #aaaaaa |
| text-4 (body) | #1c1c25 | #ffffff |
| text-5 (emphasis) | #000000 | #ffffff |
| button-secondary-default (stroke border) | #000 | #fff |

Dark sections = wrapper `div.f1rd-dark` + `background:#1c1c25` + `color:text-4(#fff)`.

### 0.6 Team color application (THE mechanism)
Page root div sets two CSS custom properties inline (from CMS data):
```html
<div style="--f1-team-colour:#27f4d2; --f1-accessible-colour:#067e6a;" class="f1rd-page contents">
```
- `--f1-team-colour` — the bright brand color: hero background fill, DRS pattern tint on driver cards.
- `--f1-accessible-colour` — a darkened/contrast-safe variant: hero gradient overlays, hero DRS
  patterns, the giant race-number mask fill, driver-card background.
Everything else references these two vars; no other per-team styling exists.

### 0.7 Radii & misc
`rounded-s`=4px, `rounded-m`=8px, career card=12px, buttons pill=1000px, tag=2px.
Spacing utilities are literal: `gap-px-8`=8px … `py-px-64`=64px, `-mb-px-8`=-8px.

### 0.8 Shared primitives

#### A. Stat tile / DataGrid (`<dl>`; 3 variants)
Anatomy of item (always): `dt` label + `dd` value.
- label: body-xs-semibold (600 14/16 Titillium), color text-3 (#aaa on dark, #606066 on light)
- value: display-l-bold (500 20/24 Formula1) -> lg: display-xl-bold (500 24/28), color text-5

Variant **two-columns** (season stats, bio facts):
```
grid; grid-template-columns: repeat(2, 1fr); gap:16px (lg: 24px)
item { flex-direction:column; gap:16px }         # label stacked above value
```
Groups of items separated by `<hr>` divider: 1px solid surface-neutral-6, full width, no margin.

Variant **rows** (Career Stats / Team Summary card):
```
grid; 1 column; gap:20px (md:22px, lg:28px)
item { display:flex; justify-content:space-between;   # label left, value right
       border-bottom:1px solid surface-neutral-6; padding-bottom:<gap> }
item:last-child { border-bottom:none }
```

Variant **columns** (Team Profile info list):
```
grid; cols: 2 (lg: 3, xl: 4); gap:16px (lg:24px)
item { flex-direction:column; gap:16px }
```

#### B. Buttons (pill, radius 1000px)
| size | padding | label type |
|---|---|---|
| small | 8px 16px | body-xs-bold (lg on hero: body-m-compact-bold) |
| medium | 10px 28px | body-m-compact-bold |
Variants:
- **white**: bg #fff, text #000; hover bg #e5e5e5
- **stroke**: transparent bg, border 2px solid (light:#000 / dark:#fff), text-5; hover bg = neutral-11 @10%
- **ghost**: transparent; hover bg neutral-11 @10%
- **tonal**: bg neutral-11 @10%; hover @20%
- **link-ghost** ("View all"): no radius/padding, 4px underline bar under text; on hover a #e10600 bar
  animates width 0->100% (300ms)
Icon+label gap 4px. Active: inset shadow `3px 2px 6px #000`, inner nudges 1px.

#### C. Racing-line separator (SVG chevron "swoosh")
Section separator: fill #e10600 (default); in hero: inline `fill:white`.
Sizes: xs=16px, sm=24px, md=30px, lg=36px, xl=45px (`--f1rd-racingline-size` = thickness;
horizontal: height=size, min-width=3x size, width 100%; vertical: width=size, height 100%).
Section headers use xs -> lg:sm, left-aligned. Direction variants: left/right/top/bottom (rotations).

#### D. DRS background pattern (decorative "DRS" letter graphics)
`span` with `mask-image:url(DRS-{X}-2x.webp); mask-size:contain; mask-position:center;
background-color: var(--f1-accessible-colour or --f1-team-colour)`; aspect-ratios:
D=6.098 (wide strip), F=0.790, F-up=1.265, G=2.028. Rotate variant = 180deg.

#### E. IconButton (carousel prev/next)
Round (radius 1000px), no padding; inner icon 24-32px.
- tonal: bg neutral-11 @10%, hover @20%
- transparent: transparent, hover neutral-11 @10%
- disabled: kept visible (no hover state)
Icon "blur" chip (video play): color #fff, border 2px solid #fff, radius 50%,
bg rgba(0,0,0,.302), backdrop-filter blur(5px), padding 6px.

#### F. CountryFlag
Circular SVG flag: `border-radius:50%`, white ring (`background & border-color #fff`).
Sizes: xs 12px/1px ring, sm 16px/1px, md 20px/2px, lg 24px/2px, xl 36px/3px.

#### G. Contextual sub-nav (both pages; sits under global header)
```
sticky, top: var(--f1-nav-height), z-10, bg surface-neutral-3 (#f7f4f1), min-height 44px
[<- Back button]                              [tab] [tab] [tab]   (right, md+ only)
```
- Back: ghost small button, left-arrow icon + "All drivers"/"All teams", body-xs-bold.
- Tabs (anchor links #statistics etc.): padding 8px, rounded-full, body-xs;
  active = text-5 + bold(700); inactive = text-3 + semibold(600); 500ms color/opacity crossfade.
- Mobile (<735px): tabs replaced by a ghost small dropdown button (current tab + chevron).

---

## 1. DRIVER DETAIL PAGE

Section order (page background alternates dark -> dark -> light-warm -> light-white):
1. Contextual sub-nav (0.8-G) — back to "All drivers", tabs: Statistics | Biography | News
2. HERO (dark, team-colored)
3. #statistics — dark #1c1c25
4. #biography — light #f7f4f1 (incl. photos tile, quote, bio text, image gallery)
5. #news — white #fff (Related Videos rail + Related Articles grid)

### 1.1 HERO
Wrapper: `.f1rd-dark` container, bg #1c1c25, inner **fluid** (edge-to-edge), panel:
```
width:100%; max-width:1696px; margin:auto; overflow:clip;
height: 678px (base) / 483px (md) / 563px (lg);
background: var(--f1-team-colour);
xl: border-bottom radius 8px (rounded-b-m) — top corners square.
```

Desktop (md+) sketch:
```
+-----------------------------------------------------------------------------------+
| <- gradient: accessible-colour 74.88% ->|  transparent 25.1%   (269.74deg)        |
|  ||racing line (white,36px, h120/144)   |      [DRS F patterns x4, centered col]  |
|  ||                                     |     +---------------------------+       |
|      Kimi            (Northwell 56/72px)|     |  GIANT NUMBER (masked div |       |
|   ANTONELLI    (Formula1 Black 40/48px) |     |  fill=accessible-colour,  |       |
|                                         |     |  h 291px md / 371px lg)   |       |
|  (o) Italy | Mercedes | 12   (14/16px)  |     |     [headshot img         |       |
|         [ Shop now ] (stroke sm)        |     |      w 305 md / 360 lg]   |       |
|  ||racing line (white, bottom)          |     +---------------------------+       |
+-----------------------------------------------------------------------------------+
```
- Left overlay (md+ only): `linear-gradient(269.74deg, accessible-colour@0 25.1%, accessible-colour 74.88%)` over the flat team-colour bg.
- DRS decoration (md+): 4 vertical `F` patterns (aspect .790) side by side at horizontal center,
  opacities .3/.2/.2/.3, colors accessible-colour, middle two rotated 180deg; each shifted
  -45px left at md (ml-0 at lg).
- Mobile decoration: one `F-up` pattern (aspect 1.265) w=734px centered above middle + one rotated
  copy below middle, opacity .3.

**Number + headshot block** — `absolute; top:120px (md:top-0); right:0; width:100% (md:50%)`:
- number: div h 342px / md 291px / lg 371px, `background: var(--f1-accessible-colour)`,
  `mask-image:url(<cloudinary>/e_trim/c_fit,h_742/.../{car#}numberwhite.webp); mask-size:contain;
  mask-position:center` (giant outlined race number as tinted silhouette).
- headshot `<img>`: absolute over it, w 222px / md 305px / lg 360px (md+: padding-top 32px).
  Cloudinary: `c_lfill,w_440/q_auto/....{driverId}right.webp` (transparent-bg torso shot facing right).

Mobile-only overlay (under text): bottom 430px,
`linear-gradient(180deg, transparent 25%, rgba(0,0,0,.5) 100%),
 linear-gradient(180deg, accessible@0 0%, accessible-colour 45%)` — text sits on this.

**Text column** — `md: margin-right 50%` (left half), flex column, gap 32px, justify
between (mobile: content pushed to bottom), items centered, color #fff:
- top racing line: vertical, white, container 36px wide, h 90/120/144px (base/md/lg)
- `<h1>` two stacked spans, centered:
  - first name: Northwell Clean Alt 400 56px/1 (lg: 72px/1), normal case, margin-bottom -8px
  - last name: Formula1 900 40px/44px (lg: 48px/52px), UPPERCASE
- meta row (flex, gap 12px, centered): flag (sm 16px; md: 12px; lg: 16px, white ring) + country
  name; vertical divider (1px wide white @30%, min-h 16px); team name; divider; race number.
  All body-xs-semibold -> lg body-s-compact-semibold.
- "Shop now" stroke small button (cart icon + label; body-xs-bold -> lg body-m-compact-bold).
- bottom racing line (mirror of top).

### 1.2 #statistics  (dark section)
Container: bg #1c1c25, text #fff. Inner padding-block 48px (lg 64px), column gap 48px.
```
STATISTICS                       <- h2, 900 32/38 -> lg 40/44, uppercase
+--------------------------------+--------------------------------+
| 2026 SEASON  (h3 900 24/28     |  +---------------------------+ |
|              -> lg 32/38)      |  | CAREER STATS   (card)     | |
| Season Position   Season Points|  | bg #303037, radius 12px   | |
|   1st                219       |  | pad 24/32/48 (b/md/lg)    | |
| -------------------------------|  | gap 32 (lg 48)            | |
| Grand Prix Races  GP Points    |  | label ........... value   | |
|   11                 198       |  | ------------------------- | |
| GP Wins           GP Podiums   |  | label ........... value   | |
|   6                  9         |  |  (DataGrid "rows": 8 rows,| |
| GP Poles          GP Top 10s   |  |   1px #606066 dividers)   | |
| DHL Fastest Laps  DNFs         |  |                           | |
| -------------------------------|  | [ Results archive ]stroke | |
| Sprint Races      Sprint Points|  +---------------------------+ |
| Sprint Wins       Sprint Pod.  |                                |
| Sprint Poles      Sprint Top10s|                                |
| -------------------------------|                                |
| [ Full season results ] white  |                                |
+--------------------------------+--------------------------------+
|                (ad slot, lg col-span-2)                          |
```
- Grid: 1 col -> lg 2 cols; column-gap 24px, row-gap 48px (lg 64px).
  DOM order: season(order-1), ad(order-2 / lg order-3 / lg col-span-2), career card(order-3 / lg order-2).
- Left column: flex col gap 32 (lg 48); inner header+grids block gap 16 (lg 24).
  Season stats = DataGrid **two-columns** in 3 groups —
  [Season Position, Season Points] | hr | [8 GP stats] | hr | [6 Sprint stats] | hr.
  Value pairs order (labels): Season Position, Season Points / Grand Prix Races, Grand Prix Points,
  Grand Prix Wins, Grand Prix Podiums, Grand Prix Poles, Grand Prix Top 10s, DHL Fastest Laps, DNFs /
  Sprint Races, Sprint Points, Sprint Wins, Sprint Podiums, Sprint Poles, Sprint Top 10s.
- CTA row: centered (lg: left). "Full season results" = white medium; "Results archive" = stroke medium.
- Career card ("CAREER STATS", h3 900 24/28 -> lg 32/38): DataGrid **rows** with labels:
  Grands Prix Entered, Career Points, Highest Race Finish ("1 (x6)" format), Podiums,
  Highest Grid Position, Pole Positions, World Championships, DNFs.
  Card: flex col, justify-between, gap 32 (lg 48), height 100%.

### 1.3 #biography  (light warm section, bg #f7f4f1)
Inner padding-block 48 (lg 64), gap 48 (lg 64).
```
~~ racing line (red, xs->sm)                       <- BundleHeader, gap 16 (lg 24)
Biography                                          <- h2 900 32/38 -> lg 40/44
Date of Birth        Place of Birth                <- DataGrid two-columns (mr-auto)
 25/08/2006           Bologna, Italy                  (label 14 text-3 / value 20->24 Formula1)
+--------------------------------+--------------------------------+
| [decor: diagonal-lines SVG     |  ¶ bio paragraph               |
|  1642px wide, opacity 40%,     |  ¶ bio paragraph  (max-width   |
|  fill #e0dedc, centered]       |    528/600/680; centered until |
|  +------------------------+    |    lg)                         |
|  |  PHOTO STORY TILE      |    |  400 16/24 -> md 17/28         |
|  |  312x468 (lg 382x573)  |    |     -> lg 20/32 Titillium      |
|  |  radius 4, bg #aaa     |    |                                |
|  |  cover img + "new" chip|    |                                |
|  |  + title overlay       |    |                                |
|  +------------------------+    |                                |
|  (block min-h 564 / lg 669)    |                                |
+--------------------------------+--------------------------------+
|        ,, (red quote SVG 32px -> lg 44px)                       |
|        "QUOTE TEXT UPPERCASE"  900 32/38 -> lg 40/44 Formula1   |
|        Kimi Antonelli   600 16/24 -> md 17/24, color #606066    |
|        (block max-w 671 md / 973 lg, centered; gap 16/lg 24)    |
+-----------------------------------------------------------------+
| IMAGE GALLERY (16:9 carousel, full-bleed scroll)                |
|  [ img radius 8 ][ img ][ img ]   height = min(viewport-based,  |
|                                     containerW/1.7778)          |
|            (<) [ i 3/3 ] (>)      <- tonal icon buttons +       |
|                                      tonal medium counter btn   |
+-----------------------------------------------------------------+
```
- Grid identical to stats: 1 col -> lg 2, gap-x 24, gap-y 48/64;
  order: tile(1), quote(2 / lg 3 + col-span-2), text(3 / lg 2).
- Photo tile ("Storyteller"): centered in cell; 2:3 portrait card; non-active state is a cover
  image with bottom gradient, white title (bottom-left) and small "new" pill chip. Recreate as a
  simple linked image card 312x468 -> lg 382x573, radius 4.
- Pull quote: figure, flex col, gap 16 (lg 24); quote-mark SVG height 32px (lg 44px) fill #e10600;
  blockquote display-2-xl-black -> lg display-3-xl-black uppercase, color #1c1c25;
  figcaption body-s-semibold -> md body-m-compact-semibold, color #606066.
- Gallery: horizontal scroll-snap strip, gap 12px; each figure w = h*16/9,
  `h = max(min(100vh - navHeights - 192px, containerWidth/1.7778), 100px)`; bg surface-neutral-2
  behind letterboxed image; radius 8. Non-current slides at opacity 20%. Caption overlay
  (toggled): black @80% panel, white body-s-compact-regular, padding 16/24. Controls row centered,
  gap 8 (lg 12): prev/next = tonal IconButtons (24px icons), middle = tonal medium button "3/3"
  with info icon; disabled state keeps tonal bg without hover.

### 1.4 #news  (white section)
```
~~ racing line (red, xs -> lg:sm)      padding-top 48 (lg 64)
Related Videos                    (<)  (>)     <- h2 900 24/28 -> lg 32/38 | transparent IconButtons (32px icons)
[video][video][video][video][video]...          <- horizontal CarouselRow, edge-faded
========------------------------------          <- 2px progress bar
Related Articles                    View all    <- h2 + link-ghost button
+---------------------------+ +---------------------------+
| [img] | title        date | | [img] | title        date |   <- 1 col -> md 2 cols,
+---------------------------+ +---------------------------+      gap 16 (lg 24), 6 items
```
**Video card** (16:9): width 250px / md 218px / lg 314px, shrink-0.
- thumb: radius 8, cover img, hover scale(1.1) 300ms;
- bottom gradient overlay `linear-gradient(180deg, transparent, #15151e)` w/ padding 16;
- play chip: blur icon (0.8-E) bottom-left; duration chip bottom-right:
  body-2-xs-semibold, white on rgba(0,0,0,.4), radius 4, padding 0 4px 1px;
- title below (padding 16px 0 32px): body-s-compact-semibold -> md body-m-compact-semibold,
  text-5, hover underline; max-width 80% of card.
- Rail: gap 8 (md 8, lg 16); side padding = container gutter (24/32/48; xl centers to 1600px);
  overflow edges covered by 80%-opacity surface strips (fade indicators).
- Progress bar: track = full-width 1px-ish `before` bg #000 @10%; fill h 2px bg #000 @30%,
  width = scroll %.
**Article list card**: horizontal `<li>`, radius 8, overflow clip, bg #f7f4f1 ("warm"),
- image left: 128x96 min (lg 176x132), cover, hover scale(1.1);
- content: flex col gap 4, padding 8px 16px 8px 8px (lg 16px);
- optional tag row: "Unlocked" pill — body-2-xs-bold uppercase white on #e10600, radius 2,
  padding 2px 4px;
- title: body-s-compact-semibold -> lg body-m-compact-semibold, text-5 (#000), grows; whole card
  clickable (title `before` covers card); hover underlines title;
- date: body-2-xs-semibold -> lg body-xs-semibold, color #606066.
Grid: 1 col -> md 2 cols; gap 16 (lg 24). Section bottom padding 48 (lg 64).

---

## 2. TEAM DETAIL PAGE

Section order:
1. Contextual sub-nav — back "All teams", tabs: Drivers | Statistics | Profile | News
2. HERO (dark, team-colored)
3. #drivers — dark #1c1c25 (driver cards)
4. #statistics — dark #1c1c25 (BundleHeader "Statistics" + same stats layout as driver)
5. #profile — light #f7f4f1 (info list + photos tile + year-by-year text + gallery)
6. #news — white #fff (identical modules to driver page)

### 2.1 HERO
Same wrapper as driver hero; heights: **585px / md 448px / lg 599px**; bg team-colour;
xl rounded-b 8px. Layout = single centered column (no left/right split):
```
+-----------------------------------------------------------------+
| [mobile only: vertical racing line, white, centered top]        |
|            [DRS "D" strip, accessible, h128/184/256, op .3]     |
|                   [ CAR IMAGE, max-h 90/127/183 ]               |
| ===racing line===   M E R C E D E S   ===racing line===         |
|        (h1 900 40/44 -> lg 48/52 -> xl 60/60, uppercase)        |
|      [DRS "D" strip left, h 66/103/120]                         |
|            George Russell   |   Kimi Antonelli                  |
|            (grid [1fr,1px,1fr], gap 12px; divider 1px           |
|             white @10%; names 600 14/16 -> lg 16/20)            |
|                      [ team logo img, h 32px ]                  |
|                      [ Shop now ] (stroke small)                |
| [mobile only: vertical racing line, white, centered bottom]     |
|  overlay: linear-gradient(180deg, transparent 50%,              |
|     rgba(0,0,0,.5) 100%), linear-gradient(180deg,               |
|     accessible@0 25%, accessible-colour 65%)   (z-20, full)     |
+-----------------------------------------------------------------+
```
- Column: flex col, items-stretch, justify-center, gap 32px; inner name block gap 16 (lg 24);
  names/logo block gap 8px. Content z-40 above overlay; car img z-40; DRS strips z-10/z-30.
- Racing lines flanking h1 (md+ only): horizontal, white, grow to fill; size md=30px ->
  lg=36px -> xl=45px. Mobile: vertical fills above/below the stack instead.
- Car image: centered, `max-width:100%`; transparent-bg side view (cloudinary asset
  `.../{year}{team}carright` — og crops use c_fill,w_1200,h_430).
- Team logo: white/monochrome variant, height 32px.

### 2.2 #drivers  (dark section)
Inner padding-block 48 (lg 64); gap 16 (lg 24).
```
DRIVERS                                  <- h2 900 24/28 -> lg 32/38, uppercase
+--------------------------------------+ +--------------------------------------+
| DRIVER CARD                          | | DRIVER CARD                          |
+--------------------------------------+ +--------------------------------------+
```
Row: flex wrap, gap 16 (lg 24); each card wrapper `grow`; cards stretch equally.

**Driver card** (container query card, whole card = link):
```
position:relative; overflow:clip; min-width:300px; min-height:256px; flex-grow;
background: var(--f1-accessible-colour); border-radius:8px; padding:16px;
display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 112px;
+--------------------------------------+
| George           (400 20/24 Formula1)|      <- hover: names underline
| Russell          (500 20/24 Formula1)|\
| Mercedes         (600 14/16, pt4 pb16)| \  [DRS "G" pattern, 1122x316 strip,
| [number mask, h1.5em w6em, white]    |  |  fill --f1-team-colour, centered;
|                                      |  |  2nd copy @30% at wide sizes]
| (o) flag 24px    [headshot img w220, |  |  + left gradient 269.74deg
|   bottom-left     -45px/-112px offset|  /  accessible@0 20.12% -> accessible 89.81%
|                   in right cell]     | /   (w 256px; lg w 479px)
+--------------------------------------+
```
- Text color #fff (static-1). Name lines: first display-l-regular, last display-l-bold.
- Race number: div h=1.5em w=6em, bg #fff, `mask-image:url(<cloudinary>/c_fit,w_876,h_742/...
  {driverId}numberwhitefrless.webp); mask-size:contain; mask-position:left center`.
- Flag: lg 24px white ring, bottom-left of row 2.
- Headshot: absolute inside right cell, width 220px, left -45px, top -112px
  (crops torso into card); cloudinary `c_lfill,w_440`.
- Container query @[474px]: DRS pattern centers + gains 2nd echo copy at 30% opacity;
  headshot side gets more room.

### 2.3 #statistics  (dark)
Same module as driver 1.2 with three differences:
1. Header is a BundleHeader: red->white? NO — racing line xs->lg:sm (default red? here inside
   dark section it renders red #e10600) + h2 "Statistics" (900 32/38 -> lg 40/44).
   Padding: **pb** 48 (lg 64) only (no pt; hero sits close), gaps 32 (lg 48).
2. Right card titled "Team Summary", DataGrid rows labels:
   Grands Prix Entered, Team Points, Highest Race Finish (1 (x130)), Podiums,
   Highest Grid Position (1 (x146)), Pole Positions, World Championships.
3. Left column identical "2026 SEASON" two-column DataGrid (same 3 groups & labels).

### 2.4 #profile  (light warm #f7f4f1)
Inner padding-block 48 (lg 64), gap 48 (lg 64); header block gap 32 (lg 48).
```
~~ racing line (red)
Team Profile                              <- h2 900 32/38 -> lg 40/44
+----------------+----------------+----------------+----------------+
| Full Team Name | Base           | Team Chief     | Technical Chief|   <- DataGrid "columns"
| Mercedes-AMG.. | Brackley, UK   | Toto Wolff     | James Allison  |      2 -> lg 3 -> xl 4 cols
| Chassis        | Power Unit     | Reserve Driver | First Team Entry     label 14/16 #606066
| W17            | Mercedes       | Fred Vesti     | 1970           |     value 20->24 Formula1 #000
+----------------+----------------+----------------+----------------+
+--------------------------------+--------------------------------+
| [photo story tile block —      |  **bold intro ¶** (700)        |
|  identical to driver bio tile: |  ¶ regular                     |
|  312x468 lg 382x573 over       |  **2025** (bold ¶ as heading)  |
|  diagonal-line decor]          |  ¶ season recap                |
|                                |  red link ¶ (#e10600,          |
|                                |   underline 1px, hover 3px)    |
|                                |  **2024** ...                  |
|                                |  "Read full year-by-year" link |
+--------------------------------+--------------------------------+
|            (order-2 cell empty on team page — no quote)         |
| IMAGE GALLERY carousel (same as driver 1.3, 6 images)           |
```
Text sizes as driver bio (16/24 -> 17/28 -> 20/32); bold spans 700 same size.
Links: `color:#e10600; underline; text-decoration-thickness:1px; hover:3px`.

### 2.5 #news — identical to driver 1.4 (Related Videos rail + progress bar + Related
Articles 2-col grid + View all).

---

## 3. IMAGE / CLOUDINARY PARAM REFERENCE
| asset | transform | ratio |
|---|---|---|
| hero + card headshot `{driverId}right.webp` | `c_lfill,w_440/q_auto` (+`d_` fallback driver image) | source ~portrait, transparent bg |
| hero giant number `{driverId}numberwhite.webp` | `e_trim/c_fit,h_742/q_auto` | mask, contain |
| card number `{driverId}numberwhitefrless.webp` | `c_fit,w_876,h_742/q_auto` | mask, contain, left |
| video thumbs | srcset widths 206/319/432/638/864/997/1316, `sizes=50vw` | 16:9 |
| gallery images | native, letterboxed in 16:9 frame | 16:9 frame |
| article thumbs | cover-cropped by CSS | ~4:3 box |
| team car `{year}{team}carright` | (og: `c_fill,w_1200,h_430`) | wide side view |

## 4. REBUILD NOTES (Next.js 15 / Tailwind v4)
- Define `--team-colour` + `--accessible-colour` per team; set inline on the page root.
- Dark sections: hard-code bg `#1c1c25`, text `#fff`, muted `#aaa`, divider `#606066`,
  card `#303037` — they do not flip with theme.
- Breakpoints md=735 lg=1069 xl=1696 differ from Tailwind defaults — use custom screens
  or nearest equivalents consistently.
- Formula1 Black(900) for all headings/uppercase; Formula1 Bold(500) for stat values;
  Titillium for everything textual; a script font (e.g. any handwriting face) for the
  driver first name.
- The DRS patterns / racing lines are pure decoration via masked spans + one SVG chevron;
  both are optional garnish and can be flat-colored shapes.
```
