# F1.com 2026 — Drivers index & Teams index: DESIGN SPEC (main content only)

Source: saved pages `F1 Drivers 2026 ….htm` / `F1 Racing Teams 2026 ….htm` + compiled CSS
(`644cc6d260920ee1*.css` Tailwind utilities, `665955b2b99a4cdd*.css` CSS modules + theme tokens, `fonts*.css`).
Everything below verified against those files. Values in px unless noted. Light theme (default `html` scope).

---

## 0. Global tokens used by these pages

### Breakpoints
| name | mechanism | value |
|---|---|---|
| md | `@media (min-width: 735px)` | 735px |
| lg | `@media (min-width: 1069px)` | 1069px |
| xl | `@media (min-width: 1696px)` | 1696px |
| page cq 2-col | `@container page (min-width: 680px)` | 680px |
| page cq 4-col | `@container page (min-width: 1660px)` | 1660px |
| driver-card cq | `@container driver-card (min-width: 474px)` | 474px |

The whole page is wrapped (direct child of `<body>`) in
`<div class="@container/page" style="--f1-container-width:1600px">` →
`container-type: inline-size; container-name: page`. Since it is full-width, the
"page" container width ≈ viewport width.

### Fonts
| family | weights used | files |
|---|---|---|
| `Formula1` | 400 (Regular), 500 (Bold woff2), 900 (Black) | Formula1-Regular/-Bold/-Black.woff2 |
| `Titillium Web` | 400, 600, 700 | Google-font equivalent OK |

NOTE: on F1.com "bold" Formula1 is registered at `font-weight: 500`, black at `900`.

### Colors (light theme)
| token | value | use here |
|---|---|---|
| surface-neutral-3 | `#f7f4f1` | page-section background (both pages) |
| surface-neutral-4 | `#e0dedc` | avatar/logo fallback bg |
| text default (html) | `#1c1c25` | h1 + subtitle color (inherited, no class) |
| static-static-1 | `#ffffff` | all text on cards, number mask, flag border |
| radius `rounded-m` | 8px | card radius |
| radius `rounded-s` | 4px | (driver row chip on team card — no visible effect) |
(dark theme equivalents: surface-3 `#15151e`, surface-4 `#303037`, text `#fff` — not needed for these pages.)

### Per-team color pairs (set as inline `style` CSS vars on each card)
`--f1-team-colour` = bright accent (DRS pattern, team-card bg, avatar bg)
`--f1-accessible-colour` = darkened accessible variant (driver-card bg, gradients, logo-chip bg)

| Team | `--f1-team-colour` | `--f1-accessible-colour` |
|---|---|---|
| Mercedes | `#27f4d2` | `#067e6a` |
| Ferrari | `#e8002d` | `#5c0012` |
| McLaren | `#ff8000` | `#804000` |
| Red Bull Racing | `#3671c6` | `#142948` |
| Racing Bulls | `#6692ff` | `#0038c2` |
| Alpine | `#00a1e8` | `#004e70` |
| Haas | `#dee1e2` | `#667175` |
| Audi | `#ff2d00` | `#751500` |
| Williams | `#1868db` | `#082145` |
| Aston Martin | `#229971` | `#0f4331` |
| Cadillac | `#aaaaad` | `#58585b` |

---

## 1. Shared page scaffold (identical on both pages)

```
<main>
└─ section wrapper                      bg #f7f4f1, full-bleed
   └─ inner container                   mx 24px | ≥735px: 32px | ≥1069px: 48px | ≥1696px: fixed 1600px, centered
      └─ column: flex flex-col          py 48px (≥1069px: 64px), gap 48px (≥1069px: 64px)
         ├─ [ad slot]                   (skip)
         ├─ title block                 flex-col, gap 16px (≥1069px: 24px)
         │  ├─ h1  "F1 DRIVERS 2026" / "F1 TEAMS 2026"
         │  └─ p   subtitle line
         ├─ CARD GRID                   (see §2 / §3)
         └─ promo banner                (see §4)
```

### Page title (h1)
- font: `Formula1` **900**; `32px / 38px`; ≥1069px: `40px / 44px`
- `text-transform: uppercase`; letter-spacing 0; color inherited `#1c1c25`
- source text is sentence case ("F1 Drivers 2026") — uppercased by CSS.

### Subtitle (p under h1)
- font: `Titillium Web` 400; `16px/24px` → ≥735px `17px/28px` → ≥1069px `20px/32px`
- max-width: 528px → ≥735px 600px → ≥1069px 680px; color `#1c1c25`

---

## 2. DRIVER CARD (drivers index)

### Grid
```
grid-cols: 1                       (page cq < 680px)
grid-cols: 2                       (page cq ≥ 680px)
grid-cols: 4                       (page cq ≥ 1660px)
gap: 16px                          (≥1069px: 24px)
```
Tailwind used: `grid grid-cols-1 @[680px]/page:grid-cols-2 @[1660px]/page:grid-cols-4 gap-px-16 lg:gap-px-24`.

### Ordering / grouping
Flat grid, **no section headers**. 22 cards, grouped as consecutive pairs by team,
teams in championship order: Mercedes, Ferrari, McLaren, Red Bull, Racing Bulls,
Alpine, Haas, Audi, Williams, Aston Martin, Cadillac.

### Element tree (exact classes from source)
```
div  style="--f1-team-colour:#27f4d2; --f1-accessible-colour:#067e6a"
     class="grow [&>*]:flex"                            ← makes the <a> a flex box so card stretches
└─ a  href="/en/drivers/slug"                           ← WHOLE CARD is the link, no other affordance
   └─ div  "@container/driver-card group/driver-card relative z-0 overflow-clip
            min-w-[300px] min-h-[256px] flex-grow w-min
            bg-[--f1-accessible-colour] rounded-m p-px-16
            grid grid-cols-2 grid-rows-[1fr,112px]"
      ├─ (bg layer A) div  "w-[1122px] h-[316px] absolute top-2/4 -translate-y-2/4 left-[31px]
      │                     @[474px]/driver-card:left-2/4 @[474px]:-translate-x-2/4 @[474px]:opacity-95"
      │   ├─ div "absolute h-[316px] left-0 (cq≥474: left-auto right-0) top-2/4 -translate-y-2/4"
      │   │   └─ span DRS-G pattern  (see below)                       opacity 1
      │   └─ div "hidden (cq≥474: block) absolute h-[316px] left-0 top-2/4 -translate-y-2/4 opacity-30"
      │       └─ span DRS-G pattern (second, faint copy)
      ├─ (bg layer B, <1069px) div "block lg:hidden absolute left-0 top-0 bottom-0 w-[256px]"
      │     style: background: linear-gradient(269.74deg,
      │              rgb(from var(--f1-accessible-colour) r g b / 0) 20.12%,
      │              var(--f1-accessible-colour) 89.81%)
      ├─ (bg layer B', ≥1069px) div "hidden lg:block absolute left-0 top-0 bottom-0 w-[300px] lg:w-[479px]"
      │     same gradient (solid on LEFT fading to transparent toward the right → keeps text legible)
      ├─ CELL r1c1  div "z-10 min-h-[112px] text-static-static-1"      ← all text white #fff
      │   ├─ p  FIRST NAME   "typography display-l-regular  group-hover/driver-card:underline"
      │   ├─ p  LAST NAME    "typography display-l-bold     group-hover/driver-card:underline"
      │   ├─ div "pt-px-4 pb-px-16" › p TEAM NAME  "typography body-xs-semibold"
      │   └─ div RACE NUMBER  "h-em-24 w-em-96 bg-static-static-1"
      │         style: mask-size:contain; mask-repeat:no-repeat; mask-position:left;
      │                mask-image:url(<number-white webp, cloudinary c_fit,w_876,h_742>)
      ├─ CELL r1c2  div (empty spacer)
      ├─ CELL r2c1  div "z-10 flex items-end justify-start"
      │   └─ svg CIRCULAR FLAG  24×24px, border 2px solid #fff, border-radius 50%
      └─ CELL r2c2  div "relative"
          └─ div "absolute w-[220px] -left-[45px] -top-[112px]"
              └─ img HEADSHOT (full-body "right"-facing cutout avif)
```

### ASCII sketch (~340×256 card, cq < 474px)
```
┌────────────────────────────────────────────┐  bg: --f1-accessible-colour (dark team tint)
│ George                    ░░▒▒▓ DRS ▓▒▒░░  │  ← DRS chevron pattern in --f1-team-colour,
│ Russell                ░▒▓   ╱ ╱ ╱   ▓▒░   │     316px tall strip, vertically centered,
│ Mercedes                 ▄▄▄▄▄▄▄▄          │     left edge at x=31px, bleeding right
│ ██ 63 ██  (white number   ████████         │
│  mask, 96×24 box)        ██ head ██        │  ← headshot 220px wide, anchored bottom-right
│                          ██ torso██        │     cell, pulled up 112px / left 45px,
│ (◉) flag 24px,           ██      ██        │     clipped by card overflow-clip
│  bottom-left             ██      ██        │
└────────────────────────────────────────────┘  radius 8px, padding 16px, min 300×256
```
Card internal layout = CSS grid `grid-cols-2 grid-rows-[1fr,112px]`:
row1 col1 = name/team/number block (min-height 112px), row2 col1 = flag bottom-left,
row2 col2 = headshot anchor (112px tall cell). Left half is text, right half image.

### Typography roles (driver card)
| role | family | weight | size/leading | case | color |
|---|---|---|---|---|---|
| First name | Formula1 | **400** | 20px / 24px | as-is | #fff |
| Last name | Formula1 | **500** | 20px / 24px | as-is | #fff |
| Team name | Titillium Web | 600 | 14px / 16px | as-is | #fff |
Team-name spacing: 4px above, 16px below (padding on wrapper).

### Race number
Not text — a **white box masked by the number artwork**: div 96×24px
(`w:6em h:1.5em` at inherited 16px font), `background:#fff`,
`mask-image:url(<team+driver number webp>)`, `mask-size:contain; mask-position:left; mask-repeat:no-repeat`.
Cloudinary transform of source art: `c_fit,w_876,h_742`. For recreation: any white
number PNG/SVG left-aligned in a 96×24 box, or styled text in an F1-like numeral font.

### Nationality flag
Circular flag, inline SVG in source. Box 24×24px, `border:2px solid #fff`,
`border-radius:50%`, transparent bg. Sits bottom-left of card (row 2 col 1, `items-end`).
Recreation: round-crop flag image inside a 24px circle with 2px white ring.

### Headshot image
- Asset: full-body driver cutout facing right ("…right.webp/avif"), intrinsic 440×1265
  (ratio ≈ 1 : 2.875), Cloudinary `c_lfill,w_440` (width-fit, transparent bg).
- Rendered: `width:220px` (height auto ≈ 632px), absolutely positioned in the 112px-high
  bottom-right grid cell at `left:-45px; top:-112px` → head starts ~12px from card top;
  body is cropped by the card (`overflow-clip`). No zoom/scale on hover.

### DRS background pattern
- `span` with `background-color: var(--f1-team-colour)` + `mask-image: DRS-G-2x.webp`
  (`mask-size:contain; mask-position:center; mask-repeat:no-repeat`), i.e. the pattern
  IS the bright team color punched through a mask. Driver card uses pattern "G":
  **aspect-ratio 2.0284528749**, height 316px → ≈641px wide.
- Wrapper strip: 1122×316px, vertically centered on the card; at card-width <474px the
  strip's left edge is +31px; at ≥474px it centers and gets `opacity:.95`, plus a second
  copy at `opacity:.30` appears on the left. (Mask asset `/assets/driverTeam/_next/static/media/DRS-G-2x~….webp`
  was NOT captured in the save — recreate with any large diagonal-chevron/letterform
  mask, or skip; the gradient + flat bg carry the design.)

### Card surface / hover / click
- bg: `var(--f1-accessible-colour)` (flat, dark). radius 8px. NO border, NO shadow.
- padding 16px all breakpoints. min-width 300px, min-height 256px (cards stretch to grid track).
- Hover: **first + last name gain `text-decoration: underline`** (group-hover). Nothing else
  moves — no transition classes, no zoom, no shadow. Cursor: pointer (whole card is `<a>`).

---

## 3. TEAM CARD (teams index)

### Grid
```
grid-cols: 1                       (page cq < 680px)
grid-cols: 2                       (page cq ≥ 680px)     ← never more than 2
gap: 16px                          (≥1069px: 24px)
```
11 cards, championship order (same as above), flat grid, no section headers,
no standings position or points shown.

### Element tree
```
a  href="/en/teams/slug"
   style="--f1-team-colour:#27f4d2; --f1-accessible-colour:#067e6a"
   class="group/team-card relative z-0 rounded-m overflow-hidden min-h-[256px]
          flex flex-col bg-[--f1-team-colour] text-static-static-1 p-px-16 lg:p-px-24"
├─ (layer 1) span "z-10 absolute top-0 bottom-0 left-0 w-[max(494px,100%)]"
│     style: background: linear-gradient(315deg,
│              rgb(from var(--f1-accessible-colour) r g b / 0) 0%,
│              rgb(from var(--f1-accessible-colour) r g b / 1) 100%)
│     → dark scrim strongest at TOP-LEFT, fading to bottom-right (bright team color shows there)
├─ (layer 2) span "z-10 absolute h-[129px] lg:h-[150px] -bottom-[2px] -left-[401px]
│                  lg:left-inherit lg:right-0 opacity-70"
│   └─ span DRS-D pattern: aspect-ratio 6.0981595092 (≈787px wide at 129px; ≈915px at 150px),
│         background-color var(--f1-team-colour), mask DRS-D-2x.webp (contain/center/no-repeat)
│         → mobile: pattern pushed far left (right tail visible); ≥1069px: pinned bottom-RIGHT
└─ (content) span "relative z-20 flex flex-col gap-[22px] lg:gap-[36px]"
   ├─ ROW 1  span "flex gap-px-24 justify-between items-start"
   │  ├─ LEFT  span "flex flex-col gap-px-12"
   │  │  ├─ p TEAM NAME "display-l-bold lg:display-xl-bold group-hover/team-card:underline"
   │  │  └─ DRIVERS span "flex flex-col lg:flex-row gap-y-px-8 gap-x-px-16"
   │  │     ├─ driver chip  span "flex gap-px-8 rounded-s items-center"
   │  │     │  ├─ avatar span › img 20×20px, border-radius:50%, object-fit:cover,
   │  │     │  │    object-position:top, style background-color: var(--f1-team-colour)
   │  │     │  │    (same full-body cutout asset, circle-cropped to the head)
   │  │     │  └─ span › span FIRST "body-xs-regular"  +  span LAST "body-xs-bold uppercase"
   │  │     │       (inline spans → render as one line: "George RUSSELL")
   │  │     └─ driver chip ×2 total (stacked <1069px, side-by-side ≥1069px)
   │  └─ RIGHT  TEAM LOGO span "TeamLogo xl" style background-color: var(--f1-accessible-colour)
   │        48×48px circle, padding 6px, radius 50%, flex-center › img 36×36 object-fit:contain
   │        (white monochrome team logo avif)
   └─ ROW 2  span "relative h-[112px]"
      └─ img CAR "absolute h-[112px] left-0 bottom-0 max-w-inherit"
           side-view car render facing right, intrinsic 1018×224 (ratio ≈ 4.54:1)
           → rendered ≈509×112px, left-aligned, overflows/clips right on narrow cards
```

### ASCII sketch (~788×256 desktop card)
```
┌──────────────────────────────────────────────────────────────────┐ bg: --f1-team-colour
│▓▓ Mercedes                                            ( M )      │ ← 48px logo circle,
│▓▓                                                    logo chip   │   bg accessible-colour
│▓  (o) George RUSSELL   (o) Kimi ANTONELLI                        │ ← 20px round avatars
│▒        14px reg+bold-caps  (row on lg, stacked on mobile)       │
│░                                                  ░░▒▒▓DRS▓▒▒░░  │ ← DRS-D strip 150px,
│   ______________________________                 ╱ ╱ ╱ ╱ ╱       │   bottom-right, 70%
│  (____ CAR side view, h=112px ___≡≡≡≡ )                          │ ← car img 509×112
└──────────────────────────────────────────────────────────────────┘ radius 8px
 ▓=dark gradient scrim (315deg, accessible-colour, solid top-left → transparent)
 padding 16px (≥1069px: 24px), min-height 256px
```

### Typography roles (team card)
| role | family | weight | size/leading | case | color |
|---|---|---|---|---|---|
| Team name | Formula1 | **500** | 20px/24px → ≥1069px 24px/28px | as-is | #fff |
| Driver first name | Titillium Web | 400 | 14px / 16px | as-is | #fff |
| Driver last name | Titillium Web | 700 | 14px / 16px | UPPERCASE | #fff |

### Spacing
- name → drivers list: 12px; row1 → car row: 22px (≥1069px 36px)
- driver chips: avatar↔name gap 8px; chip↔chip: 8px vertical (mobile) / 16px horizontal (lg)

### Hover / click
Whole card is the `<a>`. Hover: team name underlines. No other motion/transition.

---

## 4. Promo banner (bottom of grid, both pages)

Full-width rounded block after the grid (same column, so 48/64px above).
- container: radius 8px, min-height 312px (≥735px: 414px), flex col justify-end,
  content padding 16px → 24px (≥735px) → 32px (≥1069px), gap 8px (≥1069px 16px)
- Drivers page variant "a": bg `#71cc98`, text `#000`, black button
- Teams page variant "b": bg `#e10600`, text `#fff`, white button
- title: Formula1 900, 32/38 → ≥735px 40/44 → ≥1069px 48/52, uppercase source text,
  max-width 528/600/680
- subtitle: Titillium Web 600, 16/20 (≥735px 17/24)
- button (pill): radius 1000px, padding 8×16, font Titillium 700 14/16;
  black: `#000` bg / `#fff` text, hover `#333`; white: `#fff`/`#000`, hover `#e5e5e5`;
  active: `box-shadow: inset 3px 2px 6px #000` + content nudges 1px right/down.

---

## 5. Recreation notes (Next 15 + Tailwind v4)

1. **Team colors:** inline `style={{'--f1-team-colour': team.color, '--f1-accessible-colour': team.dark}}`
   on the card root; reference via `bg-[--f1-team-colour]` / `bg-[--f1-accessible-colour]`
   arbitrary values, gradients as inline style (the `rgb(from var(...) r g b / 0)` relative
   color syntax needs modern browsers; fallback: precompute a transparent hex).
2. **Container queries:** wrap page in `@container/page`; grids:
   drivers `grid grid-cols-1 @[680px]/page:grid-cols-2 @[1660px]/page:grid-cols-4 gap-4 lg:gap-6`,
   teams `grid grid-cols-1 @[680px]/page:grid-cols-2 gap-4 lg:gap-6`.
   Tailwind v4 supports named containers natively. Override default `lg:` (1024) vs F1's 1069px
   only if pixel-perfection matters (`--breakpoint-lg: 1069px` in `@theme`).
3. **DRS masks:** originals not in the save. Approximate with an SVG chevron/letterform
   mask (aspect 2.03 for driver card, 6.10 for team card) applied as
   `mask-image` on a `background-color: var(--f1-team-colour)` span — or omit.
4. **Images:** driver "right" cutouts ≈ 1:2.875 portrait w/ transparent bg (`c_lfill,w_440`);
   car side views ≈ 4.54:1 (render at h 112px); white team logos in 48px circle chip;
   number art masked white in a 96×24 left-aligned box.
5. **Both cards:** radius 8px, min-height 256px, white text, whole card one `<a>`,
   only hover effect = underline the name(s).
