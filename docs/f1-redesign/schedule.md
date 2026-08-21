# SCHEDULE (Calendar) Page — Design Spec (F1 2026 redesign)

Source: `F1 Schedule 2026 - Official Calendar of Grand Prix Races.htm` (main content only; header/footer excluded).
Note: the saved "Pre-Season Testing - Test 1" file is a duplicate capture of this same schedule page — the testing variant documented here is the grid card, there is no separate testing hero in the capture.

---

## 1. Fonts (from fonts.css)

| Family            | Weights                  | Used for |
|-------------------|--------------------------|----------|
| `Formula1`        | 400 (Regular), 500 (Bold file), 900 (Black) | Display roles (titles, country names, driver names) |
| `Formula1Wide`    | 500                      | Podium position numerals ("1"/"st") |
| `Titillium Web`   | 300/400/600/700          | Body roles (labels, GP full name, buttons) |
| `KH Interference F1` | 400, 700              | "Technical" roles (dates, race times/gaps) |

Typography roles used on this page (`font: weight size/line-height family`, letter-spacing 0 on all):

| Role token              | Value |
|-------------------------|-------|
| display-2xl-regular     | 400 32px/38px Formula1 (page H1, <1069px) |
| display-3xl-regular     | 400 40px/44px Formula1 (page H1, ≥1069px) |
| display-xl-bold         | 500 24px/28px Formula1 (country name on all cards) |
| display-l-bold          | 500 20px/24px Formula1 (hero column labels "Previous/Next/Upcoming") |
| display-s-bold          | 500 12px/16px Formula1 (podium driver name/code, uppercase) |
| body-2xs-bold           | 700 12px/16px Titillium Web (ROUND N / TESTING eyebrow) |
| body-xs-semibold        | 600 14px/16px Titillium Web (full GP title line) |
| body-m-compact-bold     | 700 17px/24px Titillium Web (buttons) |
| technical-m-regular     | 400 16px/16px KH Interference F1 (hero card date) |
| technical-m-bold        | 700 16px/16px KH Interference F1 (grid card date, <1069px) |
| technical-l-bold        | 700 20px/20px KH Interference F1 (grid card date, ≥1069px) |
| technical-xs-regular    | 400 12px/12px KH Interference F1 (date inside "completed" pill) |
| technical-2xs-regular   | 400 11px/11px KH Interference F1 (podium race time / gap) |
| Formula1Wide 500        | 10px numeral + 6px ordinal suffix (podium position) |

## 2. Color tokens (light / dark)

| Token                | Light    | Dark     | Usage here |
|----------------------|----------|----------|------------|
| surface-neutral-1    | #ffffff  | #000000  | band 1 bg + card bg |
| surface-neutral-2    | #f3f3f4  | #26262b  | — |
| surface-neutral-3    | #f7f4f1  | #15151e  | band 2 bg, date pill bg, podium chip bg |
| surface-neutral-4    | #e0dedc  | #303037  | avatar fallback bg |
| surface-neutral-6    | #aaaaaa  | #606066  | — |
| surface-neutral-11   | #000000  | #ffffff  | track-outline fill (via mask), focus outlines |
| text-3               | #606066  | #aaaaaa  | eyebrow, GP title line (secondary text) |
| text-4               | #1c1c25  | #ffffff  | date-pill text, podium position/labels |
| text-5               | #000000  | #ffffff  | primary card text |
| static-static-1      | #ffffff (both) | — | text on photo/blue cards |
| static-static-5      | #aaaaaa (both) | — | hero card placeholder bg |
| accent-bright-blue-50| #0076cc (both) | — | NEXT-race card bg |
| brand red            | #e10600 (hover #ca0500) | — | CTA button, divider, link hover underline |

## 3. Breakpoints

Viewport media queries: `md` = min-width 735px, `lg` = min-width 1069px, `xl` = min-width 1696px.
Container queries (Tailwind `@container`):
- `@container/cards` on the section wrapper → card grid + card internals respond at container widths **640px**, **738px**, **1320px**.
- `@container/up-next` on the hero strip → columns appear at container widths **640px**, **1320px**.

Page shell (`Container` component): full-width block; inner wrapper margins **24px** (<735), **32px** (≥735), **48px** (≥1069), fixed **1600px centered** (≥1696).

---

## 4. Page structure

```
<main>
└─ BAND 1  bg: surface-neutral-1 (#fff)
   └─ inner (container margins)  flex-col  py:48px (lg:64px)  gap:48px (lg:64px)
      ├─ Season selector button ("2026" + chevron-down)
      ├─ Title row: H1 + "Add F1 calendar" CTA
      └─ Hero strip: Previous | Next | Upcoming photo cards
└─ BAND 2  bg: surface-neutral-3 (#f7f4f1)
   └─ inner (container margins)  flex-col  gap:32px (lg:48px)  pt:48px  pb:48px (lg:64px)
      ├─ [ad slot 970x250 centered — omit in rebuild]
      ├─ CARD GRID (all 25 event cards, one flat list, chronological;
      │            NO month grouping, NO list/timeline toggle)
      ├─ <hr> divider: 4px solid #e10600, full width, margin 0
      └─ Season footer nav: ghost link "‹ 2025" (left) — right side empty
```

### 4.1 Season selector (top of band 1)
- Pill button, `border-radius:1000px`, border 2px solid #000 (token button-secondary-default), transparent bg, padding **8px 16px** (size "small").
- Content: label "2026" + chevron-down icon (1em), gap 4px; font 700 14px/16px Titillium (≥1069px: 700 17px/24px).
- Hover: bg rgba(0,0,0,0.1) (10% of neutral-11). Opens a season listbox (aria-haspopup).

### 4.2 Title row
- `flex flex-col lg:flex-row gap:32px justify-between lg:items-start`.
- H1: uppercase, Formula1 400 32px/38px → ≥1069px 40px/44px, color inherit (#000). Short label e.g. "RACE CALENDAR 2026".
- CTA button right (shrink-0): brand red pill — bg #e10600, white text, radius 1000px, padding **10px 28px** (size "medium"), 700 17px/24px Titillium, calendar-plus icon (1em) + label, gap 4px. Hover bg #ca0500.

### 4.3 Hero strip ("Previous / Next / Upcoming")

Wrapper: `@container/up-next  flex  gap:24px`. Three columns, each `flex-col gap:24px`:

| Column   | Visibility | Content |
|----------|-----------|---------|
| Previous | hidden; `lg:flex` (viewport ≥1069px) | label + 1 photo card |
| Next     | always; `grow` | label + 1 photo card (grows to fill) |
| Upcoming | hidden; container ≥640px | label + 1 photo card; a 2nd card appears at container ≥1320px |

Column label: Formula1 500 20px/24px, text color inherit (#000 on white).

**Hero photo card** (all identical anatomy; only the Next column's card grows):

```
┌────────────────────────────────────┐  h:312px fixed
│ ROUND 12                    ▲grad  │  min-w:312px  max-w:676px
│                                    │  radius:8px  overflow:hidden
│                                    │  bg:#aaa (placeholder)
│ Netherlands            (photo)     │
│ 21 - 23 AUG                        │
│ [sponsor logo]              ▼grad  │
└────────────────────────────────────┘
```

- Element: `<a>` block, `relative z-0 rounded-m(8px) overflow-hidden h-[312px] min-w-[312px] max-w-[676px] flex items-stretch bg-static-static-5`.
- Layer z-10: full-bleed `<img>` `object-cover`; hover: `scale(1.10)` transition 300ms (whole-card group hover).
- Layer z-20 top scrim: absolute top, h **250px**, opacity .70, `linear-gradient(0deg, rgba(0,0,0,0) 0%, #000 100%)` (black at top).
- Layer z-20 bottom scrim: absolute bottom, h **86px**, opacity .70, `linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 100%)` (black at bottom).
- Layer z-30 content: `flex-col items-stretch gap:8px p:24px`, color #fff (static-1):
  1. Eyebrow row: min-h 24px, justify-between; "ROUND 12" 700 12px/16px Titillium uppercase.
  2. Country: Formula1 500 24px/28px; underline on card hover.
  3. Date "21 - 23 AUG": KH Interference 400 16px/16px; `grow` (pushes logo to bottom).
  4. Sponsor logo: box w **66px**, `aspect-video` (16:9), img `object-contain`. (Own build: optional slot.)

---

## 5. Card grid

```
grid  justify-items-stretch  items-center
gap: 12px  |  container ≥738px: 16px  |  viewport ≥1069px: 24px
cols: 1    |  container ≥640px: 2     |  container ≥1320px: 3
```

One flat chronological list: 2 testing cards first, then rounds 1..23. Variant per state:
completed round → variant B; next round → variant C (single highlighted card in place); future rounds → variant D; testing → variant A.

**Shared card frame** (all grid variants):
- `<a class="group">` wrapping `div: relative z-0 w-full min-h-[300px] (container ≥738px: min-h-[230px]) rounded-m(8px) overflow-hidden flex items-stretch`, bg `surface-neutral-1` (#fff) — except variant C (blue).
- Inner content wrapper: `z-20 w-full flex flex-col justify-between p:12px (≥738px: 16px)`, gap 4px (testing: 10px), color text-5 (#000) — variant C uses white.
- Country name always: Formula1 500 24px/28px + `hover:underline` (on card hover).
- Country flag: circular SVG **20px** ø, border **2px solid #fff**, bg #fff, `border-radius:50%`; sits left of country name, gap **12px**.
- Eyebrow "ROUND N" / "TESTING": 700 12px/16px Titillium, color text-3 (#606066); row min-h 24px, justify-between.
- Full GP title line: 600 14px/16px Titillium, color text-3, margin-top 6px, `grow` (pushes footer content down).

### Variant A — TESTING card

```
mobile (<738 container):                ≥738px container:
┌──────────────────────────┐            ┌───────────────────┬────────┐
│ TESTING                  │            │ TESTING           │        │
│ ◉ Bahrain                │            │ ◉ Bahrain         │ photo  │
│ FORMULA 1 ... TESTING 1  │            │ FORMULA 1 ...     │ 148px  │
│ 11 - 13 Feb              │            │ 11 - 13 Feb       │ tall   │
│ ┌──────────────────────┐ │            └───────────────────┴────────┘
│ │  photo (max-h 112px) │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

- Content wrapper: `flex-col` → ≥738px `flex-row`, justify-between, gap 10px.
- Left stack: `flex-col gap:4px grow`: eyebrow TESTING → flag+name row → title line (`grow`, mt 6px) → date.
- Date: KH 700 16px/16px (no lg upsize on testing card).
- Photo block: `rounded-s(4px) overflow-clip`; mobile: full-width, `max-h:112px`; ≥738px: `h-full max-w:148px` (right column). Img `object-cover`, hover `scale(1.10)` 300ms.
- Cloudinary source: `c_lfill,w_600` photo (any wide photo; crops via object-cover).

### Variant B — COMPLETED race card (podium shown)

```
mobile (<738 container):                    ≥738px container:
┌────────────────────────────────┐          ┌────────────────────────────────┐
│ ROUND 1        [⚑ 06 - 08 Mar] │          │ ROUND 1        [⚑ 06 - 08 Mar] │
│ ◉ Australia                    │          │ ◉ Australia                    │
│ FORMULA 1 ... GRAND PRIX 2026  │          │ FORMULA 1 ... GRAND PRIX 2026  │
│ ┌────────────────────────────┐ │          │ ┌─────────┬─────────┬────────┐ │
│ │1st ◯ RUSSELL  1:23:06.801  │ │          │ │1st ◯ RUS│2nd ◯ ANT│3rd ◯ LEC│ │
│ └────────────────────────────┘ │          │ └─────────┴─────────┴────────┘ │
│   ┌──────────────────────────┐ │          └────────────────────────────────┘
│   │2nd ◯ ANTONELLI  +2.974   │ │   (mobile chips stack vertically, staggered:
│   └──────────────────────────┘ │    2nd indented 24px, 3rd indented 48px)
│     ┌────────────────────────┐ │
│     │3rd ◯ LECLERC  +15.519  │ │
│     └────────────────────────┘ │
└────────────────────────────────┘
```

- Header row: eyebrow "ROUND N" left; **date pill** right:
  - Pill: bg surface-neutral-3 (#f7f4f1), radius 4px, padding **4px 10px**, gap 6px, color text-4 (#1c1c25).
  - Contents: chequered-flag icon 16×16 + date KH 400 12px/12px ("06 - 08 Mar").
- Then flag+country row, then GP title line (`grow`).
- **Podium row**: `flex-col (≥738px: flex-row) gap:2px justify-stretch`; 3 chips, each:
  - `grow flex min-h:48px bg-surface-neutral-3(#f7f4f1) rounded-s(4px) p:8px items-center`
  - mobile: `justify-start gap:8px`; chip 2 `margin-left:24px`, chip 3 `margin-left:48px` (stagger); ≥738px: `justify-center gap:4px margin-left:0`.
  - Position block: min-w 20px, `flex-col items-start`, gap 2px, uppercase, color text-4, family Formula1Wide 500 — numeral 10px (`0.625rem`) over ordinal 6px (`0.375rem`).
  - Driver avatar: img **32×32**, `border-radius:50%`, `object-fit:cover; object-position:top`, inline `background-color:` team hex (e.g. #27f4d2 Mercedes, #e8002d Ferrari, #ff8000 McLaren, #3671c6 Red Bull); fallback bg surface-neutral-4.
  - Name column: driver name Formula1 500 12px/16px uppercase — full surname <738px, 3-letter code ≥738px; below it time/gap KH 400 11px/11px ("1:23:06.801" / "+2.974") — visible <738px and ≥1069px, hidden in the 738–1068 band.

### Variant C — NEXT race card (highlighted)

```
┌════════════════════════════════════┐  bg:#0076cc, white text
│ ROUND 12              ⟋⟋ pattern   │  same frame/radius/min-h as others
│ ◉ Netherlands                      │
│ FORMULA 1 HEINEKEN DUTCH GP 2026   │
│ 21 - 23 Aug          [sponsor logo]│
└════════════════════════════════════┘
```

- Frame: same min-heights; bg **#0076cc** (accent-bright-blue-50); NO white card bg.
- Decorative layer (z-10): absolute, `top-0 bottom-0 left-3/4 -translate-x-1/2`, opacity **0.16** → **0.30** on card hover (300ms). A block with `background-color:black` masked by the "DRS" pattern image (`mask-size:contain; mask-position:center; mask-repeat:no-repeat`), aspect-ratio 2.0285, height 100%. (Own build: any subtle dark graphic mask at 16% opacity works.)
- Content wrapper (z-20): same layout, `color:#fff` (static-1); eyebrow also white (not grey). Eyebrow row min-h 24px, no pill.
- Flag+country, then GP title (white, `grow`, mt 6px).
- Footer row: `flex justify-between items-end`:
  - Date: KH 700 16px → ≥1069px 700 20px.
  - Sponsor logo box: `w:68px h:38px` → ≥735px `w:86px h:48px`, aspect-video, img `object-contain` (white logo art).
- No countdown, no border, no badge — the blue fill + white text IS the highlight.

### Variant D — UPCOMING race card

```
┌────────────────────────────────────┐  bg:#fff
│ ROUND 13                           │
│ ◉ Italy                            │
│ FORMULA 1 PIRELLI ... 2026         │
│ 04 - 06 Sep            ╭─╮ track   │
│                        ╰─╯ outline │
└────────────────────────────────────┘
```

- Same frame as B; eyebrow row min-h 24px, right side empty (no pill).
- Footer row `flex justify-between items-end`:
  - Date left: KH 700 16px → ≥1069px 20px, color #000.
  - **Track outline** right: `<span>` `w:100px aspect-video` (≥738px container: `h-full max-w:148px`), `background-color: surface-neutral-11` (#000 light / #fff dark), with inline `mask-image:url(<track-outline>.svg); mask-size:contain; mask-repeat:no-repeat; mask-position:center`. I.e. the circuit map is a solid-color silhouette produced by masking a colored box with the SVG — recolors automatically per theme.
  - Track SVG source: cloudinary `c_lfill,w_3392` on `...track/<circuit>blackoutline.svg` (plain width transform; displayed box is 16:9 via `aspect-video`).

### Hover summary (all cards)
- Card is one `<a class="group">`: country name gets `text-decoration:underline`; any photo scales 1.10 over 300ms; variant C pattern opacity 0.16→0.30. No shadow/lift/border changes.

---

## 6. Season footer nav (bottom of band 2)

- `<hr>` divider above: `border-top:4px solid #e10600; width:100%; margin:0`.
- Row `flex justify-between`; left: ghost link button — transparent bg, no padding, radius 0, color #000, content `‹ chevron + "2025"` 700 17px/24px Titillium, gap 0; beneath it a 4px-tall underline track, transparent, whose `::after` grows `width:0 → 100%` in #e10600 over 300ms on hover. Right slot: empty (would hold "2027 ›" when applicable).

---

## 7. Asset treatment / cloudinary params seen

| Asset | Transform | Implied display |
|-------|-----------|-----------------|
| Hero photo (Next, grows) | `c_lfill,w_1296/q_auto` .webp | cover-cropped into 312px-tall card |
| Hero photos (side cards) | `c_lfill,w_720/q_auto` | same |
| Testing card photo | `c_lfill,w_600/q_auto` | cover-cropped |
| Sponsor logos | `c_lfill,w_172` (white variants) | object-contain in 66/68/86px 16:9 box |
| Driver headshots | `c_lfill,w_64/q_auto` + fallback image | 32px circle |
| Track outline SVGs | `c_lfill,w_3392` `...blackoutline.svg` | used as CSS mask on 16:9 box |

## 8. Rebuild notes (Tailwind v4 mapping)

- Use `@container` queries (`@container/cards`, breakpoints 640/738/1320px) on the section wrapper, plus viewport `lg:` = 1069px — the original mixes both (grid gap uses container 738 AND viewport 1069 steps).
- Spacing scale is raw px utilities: 2,4,8,10,12,16,24,32,48,64.
- Radii: card 8px, chips/pills/small imagery 4px, buttons 1000px (full pill).
- Both bands are full-bleed background colors; content constrained by the 24/32/48/auto-1600px container margins.
- Dark mode: flip tokens per table §2; static-* and blue/red accents stay fixed.
