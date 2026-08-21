# DESIGN SPEC — Race Weekend / Grand Prix Event Page (formula1.com 2026 redesign)

Sources: "Italian Grand Prix 2026" (UPCOMING state) and "Japanese Grand Prix 2026" (COMPLETED state).
Scope: `<main>` only. Global header/footer excluded. Light theme documented; all colors are tokens with a dark-theme mirror (see 1.2).

---

## 0. GLOBAL SYSTEM (applies to every module below)

### 0.1 Breakpoints & container
- Breakpoints (media queries): **md = 735px, lg = 1069px, xl = 1696px**.
- The whole page sits in a wrapper `div` with `container-type` named **/page** (`@container/page`) directly inside `<body>`, carrying CSS vars: `--f1-nav-height:128px; --f1-max-nav-height:172px; --f1-contextual-nav-height:0px; --f1-container-width:1600px`.
  Schedule module uses **container queries** at `@[480px]`, `@[735px]`, `@[890px]` against this wrapper (≈ viewport).
- `Container` component: full-width block; `Container_inner` = content well with side margins **24px → md 32px → lg 48px → xl: fixed width 1600px, centered**. A `fluid` variant removes margins (used by the video carousel band).
- There is **NO sticky sub-nav / tab bar inside the event page**. (`--f1-contextual-nav-height` is 0 on this page; any race sub-nav lives in the global header.)
- Section bands: each band is a `Container` with its own background, inner stack `flex flex-col; padding-block 48px (lg 64px); gap 48px (lg 64px)`.

### 0.2 Color tokens (light values / dark values)
```
surface-neutral-1   #ffffff / #000000     (card background)
surface-neutral-2   #f3f3f4 / #26262b     (page <html> bg)
surface-neutral-3   #f7f4f1 / #15151e     ("warm" band bg, divider on white)
surface-neutral-4   #e0dedc / #303037     (borders, dividers, stripes)
surface-neutral-5   #cdcdcd / #47464c
surface-neutral-6   #aaaaaa / #606066     (table head rule)
surface-neutral-7   #606066 / #aaaaaa     (muted icon)
surface-neutral-10  #15151e / #f7f4f1
surface-neutral-11  #000000 / #ffffff     (max-contrast; used at rgb/.1 for hairlines)
text-1  #ffffff / #000000                 (text on inverted chip)
text-3  #606066 / #aaaaaa                 (labels, meta, muted)
text-5  #000000 / #ffffff                 (primary text)
static-static-1 #ffffff (always white)    static-static-5 #aaaaaa (always grey)
brand red      #e10600  (hover #ca0500)
promo purple   #c1c4f4  (text on it: #15151e)
```

### 0.3 Typography (font shorthand = weight size/line-height family; letter-spacing 0 everywhere)
```
display-3-xl-black   900 40px/44px  Formula1        (lg upgrade of section h2)
display-2-xl-black   900 32px/38px  Formula1        (section h2 base)
display-2-xl-regular 400 32px/38px  Formula1        (HERO H1; also promo-card title md+)
display-xl-black     900 24px/28px  Formula1        (sub-section h2 base)
display-l-bold       500 20px/24px  Formula1        (stat tile value)
display-l-regular    400 20px/24px  Formula1        (promo overlay title base)
display-m-bold       500 16px/22px  Formula1        (session name, promo button label)
desktop-headline-small-bold 500 40px/44px Formula1  (Circuit Length big value)
technical-l-bold     700 20px/20px  "KH Interference F1"  (date day number)
technical-s-regular  400 14px/14px  "KH Interference F1"  (date month, session times)
body-l-regular       400 20px/32px  Titillium Web
body-m-regular       400 17px/28px  Titillium Web
body-m-compact-bold      700 17px/24px Titillium Web
body-m-compact-semibold  600 17px/24px Titillium Web
body-m-compact-regular   400 17px/24px Titillium Web
body-s-regular       400 16px/24px  Titillium Web
body-s-semibold      600 16px/24px  Titillium Web   (results table cells)
body-s-compact-semibold  600 16px/20px Titillium Web (card titles, session links)
body-s-compact-regular   400 16px/20px Titillium Web
body-xs-bold         700 14px/16px  Titillium Web   (small buttons, toggle active)
body-xs-semibold     600 14px/16px  Titillium Web   (table head, stat labels)
body-2-xs-bold       700 12px/16px  Titillium Web   (tag chip)
body-2-xs-semibold   600 12px/16px  Titillium Web   (timestamps, video duration)
```
- Headings that must be uppercase get a `Text_upper {text-transform:uppercase}` class (h2s, session names) — hero H1 text arrives already uppercase.
- `Formula1Digits` is declared in fonts.css but **not used anywhere on the event page** (no numeric countdown module exists here — see 2.3).
- TAG widget uses `Apax TAG Heuer` (sponsor font) at 11px/8px.

### 0.4 Shared primitives
- Radii: `rounded-s 4px`, `rounded-m 8px`, `rounded-full 1000px`. Hairline `border-thin = 1px`.
- Buttons (pill, `border-radius:1000px`):
  - `brand`: bg #e10600, white text; hover #ca0500. small = padding 8×16.
  - `stroke`: transparent bg, text-5 text, **2px solid border** (border color = black in light / white in dark); hover bg = neutral-11 @10%. medium = padding 10×28.
  - `ghost`: transparent, text-5; hover bg neutral-11 @10%.
  - `link` / `link-ghost`: no padding, no radius; child `underline` bar h-4px full-width; on hover an inner `::after` bar (bg #e10600, or text-5 for `link`) animates `width 0→100%` over .3s. Active text turns #e10600.
  - Press feedback (all filled/stroke buttons & cards): `box-shadow: inset 3px 2px 6px #000` + inner content nudged `left:1px; top:1px`.
  - Disabled IconButton: `opacity:50%`, cursor not-allowed.
- IconButton: pill, no padding; `transparent` variant (text-5, hover bg neutral-11 @10%), `white` variant (bg neutral-1, hover #e5e5e5).
- Icon sizes (SVG box): sm 16px, md 20px, lg 24px, xl 32px. "Blur chip" icon (`Icon_blur`): white icon, 2px white border, circle, bg rgba(0,0,0,.302), `backdrop-filter: blur(5px)`, padding 6px.
- Focus ring everywhere: `outline: 2px solid neutral-11; outline-offset: 2px`.
- Card hover: image `transform: scale(1.1)` transition .3s; title gets underline.
- RacingLine separator (red section divider): inline SVG, 3 paths forming a long bar broken by a diagonal chevron gap, `fill:#e10600`; size class xs → height **16px** (lg: sm → 24px), min-width 3× height, full width; `left` variant = rotate(180deg).
- Diagonal-stripe filler (used to pad incomplete grids/carousels): `repeating-linear-gradient(135deg, neutral-4 0 16px, transparent 16px 32px)`, opacity .4, rounded-m.
- Cloudinary transforms seen: hero `c_lfill,w_3392` (2×1696) on 16:9 source; article/promo images `c_lfill,w_600|720|1296`; driver headshots `c_lfill,w_64`; broadcaster logos `c_fit,w_450`; everything `f_auto/q_auto`.

---

## 1. PAGE ORDER

### Upcoming race (Italian GP)
```
[ 1  HERO PageHeader (short) — race title over photo             ]
[ 2  BAND bg:neutral-3 (warm)                                    ]
[    2.1 SCHEDULE h2 + TAG-Heuer clock pill                      ]
[    2.2 Schedule card (calendar btn + tz toggle + session rows) ]
[    2.3 "Full Schedule" stroke button (centered)                ]
[    2.4 (ad slot 970x250)                                       ]
[    2.5 FeaturedButtonCard grid (F1 TV / Tickets / Experiences) ]
[    2.6 RESULTS h2 + empty-state card                           ]
[    2.7 WHERE TO WATCH h2 + broadcaster tiles + link btn        ]
[ 3  BAND bg:neutral-1 (white)                                   ]
[    3.1 CIRCUIT BundleHeader (racing line + h2)                 ]
[    3.2 Track map | stat tiles  (2-col split)                   ]
[    3.3 ABOUT h2 + FAQ accordion                                ]
[ 4  BAND bg:neutral-3 — (ad slot only, upcoming state)          ]
[ 5  BAND bg:neutral-1, fluid                                    ]
[    5.1 racing line separator                                   ]
[    5.2 RELATED VIDEOS h2 + prev/next + card carousel           ]
[    5.3 scroll progress bar                                     ]
[ 6  BAND bg:neutral-1                                           ]
[    6.1 RELATED ARTICLES h2 + "View all" + 2-col card grid      ]
```

### Completed race (Japanese GP) — differences only
- 2.2 session rows switch to **completed** state (flag icon + Report/Results/Highlights/Lap-by-lap links, expandable on mobile).
- 2.5 FeaturedButtonCard grid has only "F1 Tickets" (1 card).
- 2.6 RESULTS becomes: h2 + **session dropdown** (right) + **results table card (top 5)** + "View full standings" button.
- Band 4 becomes the **RACE PROMO** band: h2 = country name ("JAPAN") + `DynamicArticleCard` grid (1 overlay hero md:col-span-2 + 2 stacked cards) + ad slot.
- Everything else identical (Circuit, About, Videos, Articles).

---

## 2. MODULES

### 2.1 Event hero — `PageHeader (short)`
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│                 (photo, object-cover)                  │
│                                                        │
│ ░░░░░░░░ black gradient (bottom third) ░░░░░░░░░░░░░░ │
│  FORMULA 1 PIRELLI GRAN PREMIO D'ITALIA 2026  ← H1     │
└────────────────────────────────────────────────────────┘
```
Element tree:
```
div.PageHeader.short          position:relative; overflow:clip; max-width:1696px; margin:auto
├─ img                        w/h 100%, object-fit:cover   (16:9 "Racehub header" source, c_lfill,w_3392)
└─ span.overlay               absolute left/right/bottom 0
   └─ TextGradientCaption(bottom, --tg-colour: black)
      grid; grid-template-rows: 1fr 2fr
      ├─ .gradient  grid-area 1/1/3/2; linear-gradient(180deg, black@0 → @.54 → @.87 → @1)
      ├─ .blur      grid-area 1/1/3/2; mask: linear-gradient(180deg,transparent,#000)  (blur layer slot; no filter in this build)
      └─ .child     grid-area 2/1/3/2
         └─ span.content   padding-bottom:32px; padding-x: 24px → md 32px → lg 48px
            └─ h1  display-2-xl-regular (400 32/38 Formula1), color #fff (static-1)
```
Heights: **360px → md 413px → lg 458px** (non-short variant: 472/449/505). At xl the header gets `border-radius: 0 0 8px 8px`.
NOTE: the 2026 hero is title-only — **no date range, flag, or countdown digits in the hero**. Date/flag data lives in the schedule module; country name reappears as the promo-band h2.

### 2.2 Schedule module (band 2, warm bg #f7f4f1)

Header row: `flex flex-col md:flex-row justify-between gap-16px`
- h2 "SCHEDULE": display-2-xl-black → lg display-3-xl-black, uppercase.
- Right: **TAG Heuer clock pill** (this is the page's "Countdown State" module):
```
┌──────────────────────────────────────────────┐  .f1rd-dark scope (dark tokens)
│ [shield svg]  • MY TIME     20:49   (◔ 64px) │  bg #101010; 1px border #404040;
│               TRACK TIME    17:19            │  rounded-m; padding 8px 32px
└──────────────────────────────────────────────┘
```
  - shield logo img h 38px.
  - middle: `<button>` grid-cols `[minmax(1ex,1fr) minmax(11ex,11fr) minmax(5ex,5fr)]`, gap-x 4 gap-y 10; font `Apax TAG Heuer` **11px / line-height 8px**, proportional+lining nums; row 1 (active): font-extrabold, white (`text-text-5` in dark scope) → "•  MY TIME  20:49"; row 2: font-medium, #aaa (static-5) → "  TRACK TIME  17:19".
  - right: analog clock 64×64: `relative rounded-full overflow-hidden`; 4 stacked absolute imgs — face + hour hand (`animation: spin 43200s linear infinite`), minute (3600s), second (60s); current time set via negative `animation-delay`.
  - No digit countdown exists on this page; `Formula1Digits` font is loaded but unused here.

Schedule card: `bg neutral-1 (white); rounded-m; padding 8px → md 16px → lg 24px; flex-col`
- Top strip (`pt-12 px-8 pb-32 lg:px-16`; column < 735c, row + space-between ≥ 735c):
  - "Add F1 calendar" brand button (small, red) with calendar SVG.
  - Time-zone segmented toggle: wrapper `bg neutral-4; p-4px; rounded-full`; `menu` grid 2 equal cols, min-h 32px; active pill: `bg neutral-11 (black); text-1 (white); body-xs-bold; rounded-full; py-8 px-32`; inactive: transparent, text-5, body-xs-semibold. Labels "My time" / "Track time".
- Session list `<ul>` — one CSS grid, rows via subgrid:
  - Grid columns:
    - base: `[minmax(44px,max-content)] 24px [minmax(150px,max-content)] 1fr` (4 cols)
    - @[735px]/page: `[minmax(44px,max-content)] 24px [minmax(max-content,1fr)] max-content`
    - @[890px]/page: `[minmax(44px,max-content)] 24px [minmax(150px,max-content)] repeat(4, minmax(0,1fr))` (7 cols)
  - Divider between rows: full-span `span` h-1px, `bg neutral-3` (#f7f4f1 hairline on the white card), inset via `bg-clip-content px-8 lg:px-16`.
  - Row `<li>`: `grid grid-cols-subgrid; col-span full; padding 24px 8px` (≥735c: px 16px); `rounded-s; relative z-0 overflow-hidden` (children z-20 — reserves a z-10 layer for a live-highlight bg).

  Row anatomy per state:
```
UPCOMING (Italian):
  ┌──────┬────┬─────────────────┬───────────────────────┐
  │ 04   │    │ PRACTICE 1      │        16:00 - 17:00  │
  │ Sep  │    │                 │                       │
  └──────┴────┴─────────────────┴───────────────────────┘
COMPLETED (Japanese):
  ┌──────┬────┬─────────────────┬──────┬───────┬──────┬─────────┐
  │ 27   │ ⚑  │ PRACTICE 1      │Report│Results│Highl.│Lap-by-lap│  (@890c: subgrid cols 4-7, centered)
  │ Mar  │    │ 08:00 - 09:00   │      │       │      │  [v]    │  (<735c: links collapsed; chevron IconButton)
  └──────┴────┴─────────────────┴──────┴───────┴──────┴─────────┘
```
  - Col 1 (date): `flex-col gap-5px; min-w 44px; padding-right 8px; border-right 1px neutral-4`; day = technical-l-bold (KH Interference F1 700 20/20); month = technical-s-regular (400 14/14).
  - Col 2 (status icon, 24px): empty when upcoming; **chequered-flag SVG 20px** when completed. (Live state not captured in snapshots; slot is this column.)
  - Col 3: session name display-m-bold uppercase (Formula1 500 16/22); beneath it a `min-w 150px` slot — for completed sessions it holds the time range in technical-s-regular **text-3** (muted).
  - Upcoming rows instead put the time in the last column (technical-s-regular **text-5**), right-aligned <735c / centered in col 7 ≥735c; race row shows start time only ("18:30"), other sessions "16:00 - 17:00" with `<time>` elements.
  - Completed-row links panel: spans cols 3-4 (base) / subgrid cols 4-7 (@890c); collapse animation `grid-rows-[0fr] + invisible → @735c grid-rows-[1fr] visible; transition-all .3s ease-out`; inner grid: 1 col → @480c 2 cols → @735c 4 cols, gap 24px; each link = body-s-compact-semibold, `underline decoration-1`, hover `decoration-[3px]`. Labels: Report / Results / Highlights / Lap-by-lap.
  - Mobile expander (<735c, completed only): `IconButton white` with chevron-down lg icon, top-right of row.
- Below card, centered: "Full Schedule" **stroke medium** button.

FeaturedButtonCard promo grid (still band 2): `grid grid-cols-1 md:grid-cols-2 gap-8px`
```
┌──────────────────────────────┐
│ F1 TV                    [↗] │   bg #c1c4f4; radius 8px; uppercase
└──────────────────────────────┘   label+icon: display-m-bold, color #15151e
```
- Card = flex; inner overlay `flex justify-between; padding 8px`; both children `.content` = `flex items-end; padding 8px` (label bottom-left, 24px external-link icon bottom-right). Hover: overlay `linear-gradient(0deg, rgba(0,0,0,.1) ×2), #c1c4f4`. Press: inset shadow + 2px nudge.
- Upcoming page: 3 cards (F1 TV / F1 Tickets / F1 Experiences); completed: 1 (F1 Tickets).

### 2.3 Results module (band 2)

Header: h2 "RESULTS" (same spec as Schedule h2); completed state adds right-aligned **session dropdown**: `stroke small` button, label "Race Result" + chevron-down, `aria-haspopup=listbox` (menu renders on open).

EMPTY STATE (upcoming):
```
┌────────────────────────────────────────────┐  bg neutral-1; rounded-m;
│                  (!) 32px                  │  padding-block 48px (lg 64px);
│      No results available for this session │  items centered
└────────────────────────────────────────────┘  text: body-m-compact-regular
```

RESULTS TABLE (completed) — top-5 preview:
```
┌──────────────────────────────────────────────────────────────┐ card: bg neutral-1; rounded-m;
│ POS.  DRIVER                     TIME          POINTS        │ px 24 (md 32); py 16 (md 24)
│ ══════════════════════════════════════════════════════════── │ ← thead: 2px solid neutral-6
│ 1     (◯) Kimi Antonelli ▮      1:28:03.403   25            │ rows: 1px solid neutral-4
│ 2     (◯) Oscar Piastri  ▮      +13.722s      18            │
│ ...                                                          │
│                      [ Show all ⌄ ]                          │ ghost small btn, pt 16 (md 24)
└──────────────────────────────────────────────────────────────┘
                [ View full standings ]                          stroke small btn, centered below card
```
- Wrapper card also has `scroll-mt = nav heights` (anchor target) and an inner `Table_table-wrapper`: bg neutral-1, radius 8, padding 16×24 → md 16×32 → lg 24×32; scroll area `overflow-x:auto` with `snap-x snap-mandatory` (columns are snap-start).
- thead: uppercase, body-xs-semibold, color text-3, `border-bottom: 2px solid neutral-6`.
- Cells: body-s-semibold (600 16/24), text-5, `padding 16px 24px 16px 4px` (md: right-pad 48px); first col `flush-left` (padding-left 4px), last col `flush-right` (text-right, padding-right 4px); `text-wrap: nowrap`.
- Driver cell: `flex gap-10px` → avatar (`DriverAvatar sm`: img 20×20, circle, object-fit cover, object-position top, **inline background-color = team color**, e.g. rgb(39,244,210) Mercedes / rgb(255,128,0) McLaren / rgb(232,0,45) Ferrari) + name spans: first name hidden <lg, surname hidden <md, 3-letter TLA shown only <md. An `::after` block `w-10px h-full bg-red` trails the name (team-accent bar as shipped).
- Row separators only between rows (`:not(:last-child)`), plus tbody bottom border when footer present.
- Footer: "Show all" ghost small + chevron.

### 2.4 Where to watch (band 2)
- h2: display-xl-black uppercase (no lg upgrade).
- Tile row: `grid grid-cols-2 md:flex gap-8px lg:gap-16px`.
- Broadcaster tile: `relative flex center; rounded-m; bg neutral-1; color text-5`; sizes **w-full h-80px → md 156×91 → lg 225×134**. Logo = `span` with `bg-currentColor` + `mask-image: url(logo.webp); mask-size:contain; mask-position:center` (recolors any logo to text color — theme-proof). External-link icon absolute top/right 6px (lg 10px), color neutral-7. Non-link tiles omit the icon.
- Row filler: diagonal-stripe span (0.3) `hidden md:block grow`.
- Below, centered: "Broadcast Information" `link medium` button (animated red underline).

### 2.5 Circuit section (band 3, white bg)

BundleHeader: `flex-col gap 16 (lg 24)`; racing-line separator (xs → lg:sm, left) above h2 "CIRCUIT" (display-2-xl-black → lg display-3-xl-black, uppercase).

Split: `grid grid-cols-1 md:grid-cols-2`
```
┌───────────────────────────┬─┬──────────────────────────────┐
│                           │ │ CIRCUIT LENGTH               │  ← spans both stat cols
│      (track map svg/      │ │ 5.793km            (40/44)   │
│       avif, contain)      │ │──────────────┬───────────────│  1px rgba(neutral-11,.1)
│                           │ │ FIRST GP     │ NUMBER OF LAPS│
│                           │ │ 1950 (20/24) │ 53            │
│                           │ │──────────────┼───────────────│
│                           │ │ FASTEST LAP  │ RACE DISTANCE │
│                           │ │ 1:20.901     │ 306.72km      │
│                           │ │ Lando Norris (2025)          │
└───────────────────────────┴─┴──────────────────────────────┘
        ↑ divider between halves: md+ border-right 1px rgba(neutral-11,.1); mobile: border-bottom + pb-48
```
- Map cell: `min-h 300px; max-h 220px (mobile only); flex center; md:padding-right 32px`; img `w/h full object-contain` (detailed track map asset, e.g. `2026trackmonzadetailed`).
- Stats `<dl>`: `md:padding-left 32px; pt-16px; grid grid-cols-2`; each tile `grid-rows-subgrid row-span-3` (label / value / caption align across the row), `pt-16 pb-16` (first tile `pb-32`, `col-span-2`), separators `border-top 1px rgba(neutral-11, 0.1)` (first tile none).
- Tile anatomy: `dt` label — body-xs-semibold text-3 (hero tile: body-s-compact-semibold); `dd` value — display-l-bold text-5, `margin-top 4px (lg 12px)` (hero tile: desktop-headline-small-bold 40/44); optional caption `span` body-xs-semibold text-3 (fastest-lap holder + year). Labels: Circuit Length / First Grand Prix / Number of Laps / Fastest lap time / Race Distance.

### 2.6 About accordion (band 3)
- h2 "ABOUT": display-xl-black → lg display-2-xl-black, uppercase.
- List `flex-col py-8px` of native `<details>` (same `name` ⇒ exclusive open):
  - item: `border-top 1px neutral-4` (first none).
  - `<summary>`: `flex justify-between items-center; min-h 72px; py-8px; cursor-pointer` (marker hidden); question = body-m-compact-bold; right chevron-down 24px (swaps to chevron-up when open via `[open]` CSS).
  - body: `margin-bottom 16px; pb-8px`; inner `px-24px; max-width 680px`; text body-s-regular → md body-m-regular → lg body-l-regular.

### 2.7 Race promo section (band 4, completed state only; warm bg)
- h2 = country name ("JAPAN"): display-2-xl-black uppercase.
- `ul` grid: 1 col → md 2 → lg 4; gap 8 → md 16 → lg 24; `items-stretch`.
- Card A (hero, `md:col-span-2`) — `DynamicArticleCard overlay constrained`:
  - `relative flex items-end; rounded-m; overflow:clip; bg neutral-1`; heights **234px → md 504px → lg 360px → xl 600px**.
  - image absolute inset-0 (z-10), cover; TextGradientCaption bottom (black) overlay (z-20, `f1rd-dark` scope); title link (stretched) bottom-left, `padding 0 16px 16px` (md 24), color #fff, type display-l-regular → md display-2-xl-regular → lg display-l-regular → xl display-2-xl-regular.
- Cards B/C — `DynamicArticleCard stacked`:
  - `flex-col; rounded-m; bg neutral-1; min-h 242px → md 360px → xl 600px`; image fixed height **106px → md 155px → xl 293px**, cover; content `padding 8px (md 16px); gap 4 (md 8, xl 16)`; title body-s-compact-regular → md body-m-compact-regular → xl body-l-regular, text-5.
  - hover (all): img scale 1.1, title underline; focus ring on card via `:has(:focus-visible)`.

### 2.8 Related Videos carousel (band 5 — white bg, fluid container)
- Racing-line separator (inside normal inner) above.
- Header row (normal inner margins): h2 "RELATED VIDEOS" (display-xl-black → lg display-2-xl-black, uppercase) + prev/next `IconButton transparent` (chevrons xl 32px; disabled = 50% opacity).
- Carousel (`CarouselRow`): full-bleed `overflow-x:scroll; scroll-snap-type:x mandatory`, hidden scrollbar; `--carousel-row-padding` = 24 → md 32 → lg 48 → xl `calc((100% - 1600px)/2)` as left/right padding + scroll-padding (aligns first card with the content well); `py 4px`; inner `inline-flex; gap 8 → md 8 → lg 16 (compact)`; edge "more content" indicators = absolute overlay strips, width = padding var, `bg = band color @ 80% alpha` (warm: hsla(30,27%,96%,.8); white: rgba/hsla(0,0%,100%,.8)), toggled per scroll position (right/left/both).
- VideoMediaCard (fixed width **250px → md 218px → lg 314px**, shrink-0):
```
┌────────────────────┐  thumb 16:9 (aspect-ratio 1.777), rounded 8, overflow clip
│  photo             │
│ ░░ gradient ░░░░░░ │  overlay: linear-gradient(180deg, transparent, #15151e), padding 16px
│ (▶)         [1:11] │  play = blur-chip circle (see 0.4, md pad 6px, icon 16px)
└────────────────────┘  duration chip: abs bottom-right; bg rgba(0,0,0,.4); #fff; radius 4; pad 0 4px 1px; body-2-xs-semibold
  Title 2 lines…        body-s-compact-semibold → md body-m-compact-semibold; padding 16px 0 32px; max-w 80%
```
- Trailing filler card: stripe block `h 141px → md 123px → lg 177px; opacity .4`.
- Scroll progress bar (back in normal inner): track = `relative` div with `::before` layer `bg neutral-11 @ 10%` full size; fill = `h-2px; bg neutral-11; opacity .3; width: N%` (updated by JS from scroll position).

### 2.9 Related Articles (band 6, white bg)
- Header row: h2 "RELATED ARTICLES" + "View all" `link-ghost medium` button (hover red underline anim).
- `ul` grid: 1 col → md 2 cols; gap 16 → lg 24. 6 items.
- ArticleListCard (horizontal media-object):
```
┌────────┬──────────────────────────────────┐  card: inline-flex; rounded-m; overflow clip;
│        │ [UNLOCKED]           ← optional  │  bg neutral-3 (warm variant on white band)
│  img   │ Title up to 3 lines…             │
│128×96  │                                  │
│ (lg    │ August 15, 2026                  │
│176×132)│                                  │
└────────┴──────────────────────────────────┘
```
  - image: fixed `128px × min-96px` → lg `176px × min-132px` (≈4:3), absolute-fill img cover; hover scale 1.1 (.3s).
  - content: `padding 8px 16px 8px 8px → lg 16px; flex-col gap 4px`.
  - tag chip ("UNLOCKED"): bg #e10600, #fff, radius 2px, padding 2×4, uppercase, body-2-xs-bold.
  - title: body-s-compact-semibold → lg body-m-compact-semibold, text-5, flex-grow, stretched-link (`::before` inset-0); hover underline.
  - timestamp: body-2-xs-semibold → lg body-xs-semibold, text-3.
  - optional type icon (quiz/video): blur-chip, absolute `left 8px bottom 8px` over image.
- Card reuse: identical `ArticleListCard` used site-wide (news listing); event page selects the `warm` bg variant. Videos reuse `VideoMediaCard`; only the promo band's `DynamicArticleCard overlay/stacked` sizing is bespoke to race pages.

---

## 3. STATE MATRIX (upcoming vs completed)

| Element                    | Upcoming (Italy)                  | Completed (Japan)                              |
|----------------------------|-----------------------------------|------------------------------------------------|
| Session row icon col       | empty                             | chequered flag 20px                            |
| Session time position      | right column, text-5              | under session name, text-3                     |
| Session links row          | absent                            | Report/Results/Highlights/Lap-by-lap; mobile expand chevron |
| Results section            | empty-state card                  | session dropdown + top-5 table + standings btn |
| Promo band (4)             | ad only                           | country h2 + DynamicArticleCard grid + ad      |
| FeaturedButtonCards        | F1 TV + Tickets + Experiences (3) | Tickets (1)                                    |
| Hero, Circuit, About, Videos, Articles | identical            | identical                                      |

Live state: not present in either snapshot; the schedule row reserves the icon column and a z-10 background layer for it, and the results dropdown/table pattern applies per session as results land.
