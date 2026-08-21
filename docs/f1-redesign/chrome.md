# F1.com 2026 Redesign — GLOBAL CHROME Design Spec

Source: saved formula1.com pages (2026 redesign, "f1rd" design system). Verified identical
header/footer markup on the Drivers' Standings page and the homepage — this chrome is global.
Target: Next.js 15 + Tailwind CSS v4 recreation (layout/typography/colors only).

---

## 0. How the brand feels

Dense, technical, engineered — but warm. The 2026 redesign moved away from pure black/white:
light surfaces are **warm off-whites** (#f7f4f1, #f3f3f4) and darks are **blue-tinted
"carbon" blacks** (#15151e, #1c1c25), never pure grey. Corner rounding is modest and binary:
**8px for cards/containers/dropdowns, fully-round (1000px) pills for every button**. Nothing
uses 12–24px "soft" radii. There are effectively **no drop shadows** — depth comes from flat
surface steps and 1px hairlines; the only shadow in the system is an *inset* press shadow on
active buttons. Type is strict: Formula1 (the corporate face) for display/UI labels, often
UPPERCASE, at small sizes (12–16px) with tight 0 letter-spacing; Titillium Web for body copy;
a monospaced timing face for numbers. Hover states are quiet: background tint at 10% black/white,
1–2px underline bars, or a 0.3s image zoom — never color inversions. Spacing is a strict 4px
grid (2/4/8/12/16/24/32/48/64). The overall effect: an information-dense broadcast graphics
package, flat and precise, with red used **sparingly** as a signal color (active nav underline,
primary CTA, brand marks) — not as a background wash.

---

## 1. Design tokens

### 1.1 Color — static ramp (theme-independent, "static-static-N")

| Token | Hex | Typical use |
|---|---|---|
| static-1 | `#ffffff` | white text/icons on dark, white surfaces |
| static-2 | `#f7f4f1` | "warm white" |
| static-3 | `#e0dedc` | warm light grey (muted text on dark: countdown unit labels) |
| static-4 | `#cdcdcd` | light grey |
| static-5 | `#aaaaaa` | mid grey (secondary text on dark) |
| static-6 | `#606066` | cool mid grey |
| static-7 | `#47464c` | dark grey (footer sponsor tier 3 bg, sponsor hover bg) |
| static-8 | `#303037` | darker grey (footer sponsor tier 2 bg, header bottom hairline) |
| static-9 | `#1c1c25` | near-black blue (footer sponsor tier 1 bg) |
| static-10 | `#15151e` | "carbon black" — event-tracker bg, dark page surface |
| static-11 | `#000000` | true black |

### 1.2 Color — semantic (CSS vars, flip between light/dark)

Light theme = default on `html`; dark applied via `@media (prefers-color-scheme: dark)` to
`html`/`.f1rd-system`, and **forced** per-section with `.f1rd-dark` / `.f1rd-light` classes
(the header nav bar and footer sponsor strips are always `.f1rd-dark`).

| Token (`--f1rd-colour-…`) | Light | Dark |
|---|---|---|
| surface-neutral-1 | `#fff` | `#000` |
| surface-neutral-2 (html page bg) | `#f3f3f4` | `#26262b` |
| surface-neutral-3 (chrome bars bg) | `#f7f4f1` | `#15151e` |
| surface-neutral-4 (hairlines/borders) | `#e0dedc` | `#303037` |
| surface-neutral-5 | `#cdcdcd` | `#47464c` |
| surface-neutral-6 (divider grey) | `#aaa` | `#606066` |
| surface-neutral-7 | `#606066` | `#aaa` |
| surface-neutral-8 | `#47464c` | `#cdcdcd` |
| surface-neutral-9 | `#303037` | `#e0dedc` |
| surface-neutral-10 | `#15151e` | `#f7f4f1` |
| surface-neutral-11 ("ink") | `#000` | `#fff` |
| text-1 (inverse text) | `#fff` | `#000` |
| text-2 | `#f7f4f1` | `#15151e` |
| text-3 (muted text) | `#606066` | `#aaa` |
| text-4 (default text — set on html) | `#1c1c25` | `#fff` |
| text-5 (strong text) | `#000` | `#fff` |
| system-negative | `#e91711` | `#ff2d27` |
| system-neutral | `#606066` | `#cdcdcd` |
| system-positive | `#1a8930` | `#28973e` |
| accent-hot-red-20 | `#f6b4b2` | `#710e10` |
| accent-sector-purple-70 | `#5300a6` | `#370969` |
| accent-sector-purple-80 | `#370969` | `#5300a6` |
| button-secondary-default | `#000` | `#fff` |
| button-tonal-default | `#e0dedc` | `#303037` |

`html { background: var(surface-neutral-2); color: var(text-4); }`

Translucency helpers: 40% and 80% alpha versions of surface-1/3 exist; modern CSS
`rgb(from var(--x) r g b / .1)` is used everywhere for 10–20% tints.

### 1.3 Color — brand + accents (fixed, no theme flip)

| Name | Hex | Use |
|---|---|---|
| **hot red (brand)** | `#e10600` | primary buttons, active nav underline, F1 logo, red divider, racing-line motif |
| hot red hover | `#ca0500` | brand button hover |
| carbon black | `#15151e` | brand dark |
| warm white | `#f7f4f1` | brand light (logo tint class `text-brand-warm-white`) |
| spark yellow | `#e6f854` | special CTA button variant |
| shift green | `#71cc98` | accent bg |
| live blue | `#0076cc` (hover `#006ab8`) | LIVE tags/buttons |
| breaking yellow | `#ffd100` (hover `#e5bc00`) | BREAKING tag |
| unlocked/magenta tag | `#e51073` (hover `#ce0e68`) | tag variant |
| warning orange | `#e66700` | status badge error |

### 1.4 Typography

Font faces (self-hosted):
- **Formula1** — weights 400 (Regular), **500 (Bold)**, 900 (Black), 400 italic. The UI/display face. NOTE: "bold" in this system = weight 500.
- **Formula1Wide** — weight 500. Rare, for extra-wide display headlines.
- **Formula1Digits** ("KH Interference F1" in their compiled CSS) — 400/700. Timing/numeric font (countdowns, gaps, laps). Line-height always 1.0.
- **Titillium Web** — 300/400/600/700 (+italics). All body copy and small UI labels.
- (Also present, ignorable: "Northwell Clean Alt" handwritten accents; "Apax TAG Heuer" only inside the sponsor clock widget.)

Letter-spacing is **0 everywhere** except 0.5px on 24px subheadlines/mobile-headline-small.
Uppercase is applied via a utility (`text-transform: uppercase`), not baked into styles.

Type roles (the new "role" scale — sizes in rem, `size/line-height family`):

**display-\* (Formula1)** — headings, section titles, standings names, nav-adjacent labels

| Role | Spec |
|---|---|
| display-s | 0.75rem/1rem (12/16) |
| display-m | 1rem/1.375rem (16/22) |
| display-l | 1.25rem/1.5rem (20/24) |
| display-xl | 1.5rem/1.75rem (24/28) |
| display-2xl | 2rem/2.375rem (32/38) |
| display-3xl | 2.5rem/2.75rem (40/44) |
| display-4xl | 3rem/3.25rem (48/52) |
| display-5xl | 3.75rem/3.75rem (60/60) |

Each in `regular` (400), `bold` (500), `black` (900).

**body-\* (Titillium Web)** — copy and small labels

| Role | Spec |
|---|---|
| body-2xs | 0.75rem/1rem (12/16) |
| body-xs | 0.875rem/1rem (14/16) |
| body-s | 1rem/1.5rem (16/24); compact: /1.25rem |
| body-m | 1.0625rem/1.75rem (17/28); compact: /1.5rem |
| body-l | 1.25rem/2rem (20/32) |

Each in regular (400), semibold (600), bold (700).

**technical-\* (Formula1Digits / KH Interference F1)** — numbers; line-height == font-size

| Role | Size |
|---|---|
| technical-2xs | 11px |
| technical-xs | 12px |
| technical-s | 14px |
| technical-m | 16px |
| technical-l | 20px |
| technical-xl | 24px |
| technical-2xl | 28px |
| technical-3xl | 36px |
| technical-4xl | 44px |

Each in regular (400) and bold (700).

Responsive pattern: base class + `md_`/`lg_`/`xl_` prefixed override classes (e.g. footer
headings are `display-xl-black` + `lg:display-2xl-black`).

### 1.5 Breakpoints & container

Media query breakpoints (min-width): **735px (md), 1069px (lg), 1696px (xl)**; occasionally
Tailwind's 640px; `max-width:360px` clamps the page to 360px wide.

**Container component** (every chrome bar and page section uses it):
- outer: `display:block; width:100%` + a background color class
- inner: horizontal margins **24px** (<735), **32px** (≥735), **48px** (≥1069);
  at **≥1696px: fixed `width:1600px`, margin auto** (max content width 1600px).

The whole page is wrapped in a CSS container `@container/page` div carrying:
`--f1-nav-height:128px; --f1-max-nav-height:172px; --f1-contextual-nav-height:0px;
--f1-container-width:1600px`. Component CSS uses `@container page (min-width: …)` queries
(e.g. nav link font grows at page-container ≥1348px). In Tailwind v4 use `@container` +
arbitrary container queries, or approximate with viewport breakpoints.

### 1.6 Spacing

Strict pixel scale, used via `p-px-N`/`gap-px-N` utilities: **2, 4, 8, 12, 16, 24, 32, 48, 64**
(+ 6px appears as one-off `p-[6px]`). Vertical rhythm of chrome sections: 32/48/64.

### 1.7 Radius

| Token | Value | Use |
|---|---|---|
| xs | 2px | small tags |
| s | 4px | medium tags |
| m | **8px** | cards, tables, dropdowns, sponsor hover tiles, app card |
| l | 16px | rare large panels |
| full | 1000px | ALL buttons & icon-buttons (pill) |

### 1.8 Borders, dividers, focus, shadows, motion

- Hairlines: `border-…-thin` = **1px**; `border-…-medium` = **2px** (active underlines).
- Divider component: 1px (sm) / 4px (md) / 8px (lg) lines in grey `surface-neutral-6`,
  light-grey `surface-neutral-4`, red `#e10600`, or white@30%.
- Focus: `outline: 2px solid var(surface-neutral-11); outline-offset: 2px` on every
  interactive component.
- Shadows: none in the resting UI. Pressed (`:active`) buttons get
  `box-shadow: inset 3px 2px 6px #000` and the inner label nudges `left:1px; top:1px`.
- Motion: default transitions 150ms `cubic-bezier(.4,0,.2,1)`; link-underline grow 300ms;
  card image zoom `scale(1.1)` over 300ms; event-tracker collapse 500ms ease-out;
  tab color transitions 500ms. Hover feedback is background-tint (10–20% of ink color),
  underline, or opacity 0.7 (image links).

---

## 2. HEADER

Three stacked bars. Bar 1 (masthead) scrolls away; bars 2+3 live in a `sticky top-0 z-10`
wrapper — the primary nav sticks, and the event-tracker below it collapses on scroll
(`grid-rows-[1fr]` → `[0fr]`, `transition-all duration-500 ease-out`, `overflow-y-hidden`).
A skip-link ("Skip to content") sits absolutely at `top:-112px`, popping to `top:8px` on
focus-within, styled as a small brand pill on a white rounded-full chip, `z-40`.

### 2.1 Desktop layout (≥1069px)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ BAR 1 · MASTHEAD  (light: #f7f4f1 / dark: #15151e; follows theme; min-h 44px)     │
│ [Race Series ⌄]                AUTHENTICS STORE TICKETS HOSPITALITY EXPERIENCES   │
│  (ghost pill btn)              ARCADE │ F1TV-logo │ [Sign In] [Subscribe]         │
│                                        1px divider   black pill  red pill         │
├───────────────────────────────────────────────────────────────────────────────────┤
│ BAR 2 · PRIMARY NAV  (ALWAYS DARK #15151e; min-h 64px; 1px bottom border #303037) │
│  ███ faint chequered-flag SVG pattern, white @ 15% opacity, offset left:200px,    │
│      fading under a vertical gradient of the bar color (alpha 0→1)                │
│ [F1 logo 24px red]   Schedule  Results  Standings  Drivers  Teams  F1 Unlocked    │
│    gap 32px          14px Formula1-400 white; active: 500 + 2px red underline ─── │
│                                                      [≡ hamburger 36px] [FIA 32px]│
├───────────────────────────────────────────────────────────────────────────────────┤
│ BAR 3 · EVENT TRACKER (always #15151e "static-10", min-h 56px, collapses on scroll│
│ [flag◯] Netherlands ›   FP1 │ 19 H 12 M 28 S        [sponsor logo] [clock 38px]   │
│  12px Formula1        16px Formula1-500 │ digits: technical-m-bold 16px           │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Mobile layout (<1069px)

Masthead (bar 1) is `hidden lg:flex` → **mobile shows only bars 2+3**. Bar 2 min-height:
**54px** (<735), **58px** (735–1068), **64px** (≥1069). Nav links live in an
`overflow-x-hidden` grow div (they clip; full nav is reached via the hamburger drawer).
A 24px-tall 1px divider appears between hamburger and FIA logo only below lg.

```
┌────────────────────────────────────────────┐
│ BAR 2 (54px, dark)                         │
│ [F1 logo] (clipped nav links…) [≡] │ [FIA] │
├────────────────────────────────────────────┤
│ BAR 3 event tracker (56px, dark)           │
│ [◯] Netherlands › FP1 │ 19H 12M 28S [clock]│
└────────────────────────────────────────────┘
```

### 2.3 Bar 1 — masthead details

- Wrapper: Container (bg `surface-neutral-3`), inner row `hidden lg:flex min-h-[44px]
  justify-between items-center gap-48px`.
- Left: "Race Series" dropdown trigger — **ghost small button**: pill, padding 8px 16px,
  transparent bg, text-5 color, `body-xs-bold` (14px Titillium 700), label + 24px chevron-down
  SVG (`1em`), hover bg = ink @ 10%. Opens a `<dialog>` positioned `absolute z-30 top:48px
  left-0 mt-12px` containing a DropdownMenu (see §5.6) listing race series (F1®, F2, F3, F1 Academy…).
- Right cluster: `flex items-center gap-12px`:
  - 6 text links (AUTHENTICS, STORE, TICKETS, HOSPITALITY, EXPERIENCES, ARCADE):
    `<span class="block p-[6px] text-text-4 border-b-thin border-transparent
    hover:border-text-4">` with `body-xs-semibold uppercase` (14px Titillium 600 caps).
    Hover = 1px underline via bottom border, no color change.
  - Divider: 1px vertical, light-grey (`surface-neutral-4`), min-height 1rem.
  - F1TV wordmark SVG, height 16px (mark in currentColor + red #e10600 accents).
  - Divider again.
  - **Sign In** — black small button: pill, 8px 16px, `#000` bg / `#fff` text, hover `#333`,
    `body-xs-bold`.
  - **Subscribe** — brand small button: pill, 8px 16px, `#e10600` bg / white text, hover `#ca0500`.

### 2.4 Bar 2 — primary nav details

- Outer: `relative z-10 overflow-x-clip border-b-thin border-[#303037]`; Container has
  `f1rd-dark` + bg `surface-neutral-3` → resolves to **#15151e always**; default text white.
- Decorative layer (absolute, inset-0): chequered-flag SVG (`fill: #fff`) at `opacity-15`,
  `left:200px right:0`; above it a full-bleed gradient
  `linear-gradient(180deg, rgb(from bar-bg r g b / 0) 0%, rgb(from bar-bg r g b / 1) 100%)`
  so the pattern fades toward the bar's bottom edge.
- Content row: `min-h 54/58/64px, flex items-stretch`; inner `flex gap-32px items-center
  justify-between`.
- **F1 logo**: inline SVG, `height:24px`, fill `#e10600`, link color `text-brand-warm-white`.
- **Nav links** (Schedule, Results, Standings, Drivers, Teams, F1 Unlocked):
  - each: full-height flex item, `padding: 4px 8px` (py-4px px-8px), `border-b-medium` (2px);
  - font: **Formula1 400, 14px** (16px when page container ≥1348px), white, `whitespace-nowrap`;
  - idle: transparent bottom border; **hover: 2px white bottom border**;
  - **active page: weight 500 + 2px `#e10600` bottom border** (no hover change);
  - link gap between items: 32px.
- **Hamburger**: 36px-wide transparent IconButton (pill; 20px "≡" SVG + 6px padding + 2px
  transparent border), hover bg white@10%. Opens the burger drawer (client-rendered; primary
  entries: News, Videos, Live Timing, Schedule, Results, Standings, Drivers, Teams,
  F1 Fantasy, F1 Predict, Gaming, F1 Betting, F1 Unlocked). Container query name
  `mega-nav` exists with a 1440px 2-column switch — build as full-screen overlay listing
  links in 1 col (mobile) / 2 cols (≥1440px container).
- **FIA logo**: monochrome SVG `height:32px`, `path{fill:currentColor}` (white on the dark bar).

### 2.5 Bar 3 — event tracker details

- Collapsible grid wrapper: `f1rd-dark bg-[#15151e] text-white grid grid-rows-[1fr]
  overflow-y-hidden transition-all duration-500 ease-out` (JS flips rows to 0fr on scroll).
- Container: bg static-10 `#15151e`, `border-b-thin border-b-surface-neutral-4`.
- Row: `min-h-[56px] flex justify-between items-center py-8px`.
- Left group (link to race page): round country-flag SVG (1em ≈ 16px) + race/country name in
  `display-s-regular` (12px Formula1) + 16px chevron-right icon; then `flex gap-12px`:
  session name ("FP1") in `display-m-bold` (16px Formula1 500); 1px vertical separator
  (white @ 20%, self-stretch); countdown digits in `technical-m-bold` (16px digits font)
  with unit letters (H/M/S) in `technical-xs-regular` (12px) colored `static-3` (#e0dedc),
  digits/units aligned `items-end`, `gap-2px`, 2px right padding after each unit.
- Right group: sponsor shield img `h-28px` + (md+) a tiny two-row "MY TIME / TRACK TIME"
  toggle (sponsor font, 11px, strong row white `text-5`, dim row `static-5`) + animated
  analog clock, 38px circle (`rounded-full`, layered spinning hand images).

---

## 3. FOOTER

Five stacked full-width bands. Bands 1–3 are the sponsor strip (forced `.f1rd-dark`, white
text) stepping **lighter** as you descend: `#1c1c25` → `#303037` → `#47464c`. Bands 4–5 are
one themed Container (`surface-neutral-3`: warm white in light mode, #15151e in dark).

```
┌───────────────────────────────────────────────────────────────────────────┐
│ TIER 1  bg #1c1c25 · py 32/48 · gap 48/64                                 │
│  OUR PARTNERS (display-xl-black caps, lg: display-2xl)      View all ──   │
│  [logo] [logo] [logo] [logo] [logo] [logo] [logo]   (centered, wrapping)  │
├───────────────────────────────────────────────────────────────────────────┤
│ TIER 2  bg #303037 · same padding · logos only (no heading)               │
├───────────────────────────────────────────────────────────────────────────┤
│ TIER 3  bg #47464c · same padding · logos only                            │
├───────────────────────────────────────────────────────────────────────────┤
│ MAIN  bg surface-neutral-3 (#f7f4f1 light / #15151e dark) · py 48px       │
│ ┌───────────────┐  QUICK LINKS   │  LEGAL & COMPLIANCE │ SUPPORT & CORP.  │
│ │ APP PROMO CARD│  Schedule    › │  Terms of Use       │ F1 Help Centre   │
│ │ rounded-m     │  Results     › │  Privacy policy     │ Partners         │
│ │ ink @ 4% bg   │  Standings   › │  … (11 items)       │ … (4 items)      │
│ │ 64px app icon │  Drivers     › │                     │                  │
│ │ heading black │  Teams       › │  GUIDELINES & PREF. │ COMMUNITY & CNT. │
│ │ store badges  │  F1 Unlocked › │  Guidelines         │ F1 Fan Voice     │
│ │ 370px wide lg │  [FEEDBACK CARD]│ Cookie Preferences │ Beyond The Grid  │
│ └───────────────┘       ▲ 1px vertical dividers between columns (md+)     │
│                                                                           │
│  ~~~~~~ red racing-line motif ~~~~~~~~~~~~~~~~~~~~~~~~~~~  [F1 logo 16px] │
│                                                                           │
│  [Display mode ⌄ stroke pill]        [f] [x] [ig] [yt]  (icon buttons)    │
│                       © 2003-2026 … (body-2xs-semibold, text-3, right)    │
└───────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Sponsor tiers (1–3)

- Each: Container + `flex flex-col py-32px lg:py-48px gap-48px lg:gap-64px`.
- Tier 1 only, heading row: `flex justify-between items-center mt-12px lg:mt-16px` —
  "OUR PARTNERS" in `display-xl-black` uppercase (lg: `display-2xl-black`) + "View all"
  **link-ghost medium button** (see §5.1; text `body-m-compact-bold`, animated red underline).
- Logo row: `flex flex-wrap justify-center items-center gap-48px md:gap-[44px] lg:gap-[42px]`.
- Each logo link: width **72/88/96px** (base/md/lg), `p-8px -m-8px rounded-m`,
  **hover bg `#47464c`**; img inside width 56/72/80px, `aspect-video object-contain`
  (all logos are white monochrome versions).

### 3.2 Main band

Wrapper: Container (`surface-neutral-3`, follows theme) → `flex flex-col py-48px` →
top row `flex flex-wrap lg:flex-nowrap justify-between gap-24px items-stretch`.

**App promo card** (first cell):
- `rounded-m` (8px), bg `static-11` at 4% opacity (`bg-black/[0.04]`; on dark theme still
  black tint), `p-24px`, `overflow-clip relative`;
- sizing: `w-full`, `lg:basis-[370px] lg:shrink-0 lg:grow-0`; min-h 234px / md 222px / lg 484px;
- giant chequered SVG watermark, 1200×1200, absolute bottom-left, masked to 3–5% alpha;
- content `flex flex-col gap-16px`: 64×64 app icon; heading `display-xl-black` caps
  (lg `display-2xl-black`); sub-line `display-s-regular` caps; store badges row `gap-12px`,
  badges 122×36, hover `opacity-70`.

**Link columns** (3 flex columns, each `md:flex-1`, separated by 1px vertical grey dividers
(`surface-neutral-6`) on md+; on mobile each group separated by 1px `<hr>` instead):
- Column heading: `display-s-bold` (12px Formula1 500) UPPERCASE; 24px gap below to list.
- Column 1 "QUICK LINKS": `ul` gap **24px**; links = `display-s-regular` (12px Formula1)
  in default text-4 color, row `flex items-center gap-8px` with a **16px chevron-right icon**;
  hover: `underline decoration-2 underline-offset-2`. Below it, a **FeaturedButtonCard**
  ("SHARE YOUR FEEDBACK", max-w 370px): white card, `rounded-m`, `display-m-bold` caps,
  content padding 8px+8px, arrow icon 24px bottom-right, hover bg `surface-neutral-2`,
  active inset shadow + 2px content nudge.
- Columns 2–3: two stacked groups each (`md:mt-48px` between groups). Lists gap **16px**;
  links `display-s-regular` in **muted `text-3`**, no chevron, same hover underline.
  Groups: LEGAL & COMPLIANCE (Terms of Use, Privacy policy, Cookies Policy, Legal Notices,
  Code of Conduct, Anti-Bribery, Modern Slavery Statement, Gender Pay Report, F1 Betting
  Disclaimer, Accessibility Statement, Human Rights) · GUIDELINES & PREFERENCES (Guidelines,
  Cookie Preferences[button]) · SUPPORT & CORPORATE (Help Centre, Partners, Become an
  Affiliate, Corporate Site) · COMMUNITY & CONTENT (Fan Voice, Beyond The Grid podcast).

**Racing-line separator row**: `flex gap-24px pt-48px lg:pt-64px pb-32px, role=separator` —
a stretched "racing line" SVG motif (height 16px, `fill:#e10600`, xs size, mirrored) + F1
logo SVG at height 16px on the right.

**Bottom controls**: `grid gap-16px min-[640px]:grid-cols-2 items-center md:pb-48px`:
- left: "Display mode" dropdown trigger — **stroke small button** (pill, 2px border in
  button-secondary color = ink, transparent bg, `body-xs-bold`, chevron; hover bg ink@10%).
  Menu offers System/Light/Dark.
- right: social row `flex gap-8px`: transparent IconButtons (Facebook, X, Instagram, YouTube),
  20px glyph icons, hover bg ink@10%.
- Copyright: `body-2xs-semibold` (12px Titillium 600), color text-3, `text-right`.

---

## 4. Page scaffolding notes

- `html { overflow: auto; scrollbar-gutter: stable; }`, `body { relative; overflow-x-clip }`.
- Header/footer get class `webview-hidden` (hidden when rendered inside the app webview).
- Main content: `<main id="maincontent" class="relative z-0">`.
- Below the sticky nav, pages open with their own contextual sub-nav (e.g. results tabs, §5.7).

---

## 5. Global UI primitives

### 5.1 Button (text pill)

Base: `inline-flex; border-radius:1000px; border:0; vertical-align:middle`; label wrapped in
an inner span (`inline-flex items-center; gap:4px` when icon present). Typography is passed
as a class: small → `body-xs-bold` (14px Titillium 700), medium → `body-m-compact-bold`.

| Size | Padding |
|---|---|
| (base/xs) | 4px 12px |
| small | 8px 16px |
| medium | 10px 28px |

| Variant | BG / text | Hover |
|---|---|---|
| **brand** (primary) | `#e10600` / `#fff` | `#ca0500` |
| black | `#000` / `#fff` | `#333` |
| white | `#fff` / `#000` | `#e5e5e5` |
| stroke (secondary) | transparent, 2px border in ink | bg ink@10% |
| ghost | transparent / text-5 | bg ink@10% |
| tonal | ink@10% / text-5 | ink@20% |
| neutral | ink / text-1 | ink@80% |
| live | `#0076cc` / #fff | `#006ab8` |
| spark | `#e6f854` / #000 | 80% alpha |
| link / link-ghost | transparent, radius 0, padding 0; has a 4px-tall underline bar under the label — bar bg = text color (link) or transparent (link-ghost); hover animates a `#e10600` bar over it, `width 0→100%` in 300ms; active text `#e10600` | — |

All: focus `outline 2px ink offset 2`; active (except link) `box-shadow: inset 3px 2px 6px #000`
+ inner nudged 1px; disabled 50% opacity + not-allowed cursor. Full-width variant <735px.

### 5.2 IconButton

Pill, `padding:0`; inner = Icon component (glyph 8–40px + 2–14px padding + 2px transparent
border; "md" = 20px glyph + 6px pad → 36px total). Variants mirror Button (brand, transparent,
translucent ink@60%, white, black, tonal, neutral). Same focus/active/disabled conventions.

### 5.3 Tag (chip)

`inline-flex; text-transform: uppercase; white-space: nowrap; gap 4px`.
Sizes: small → 2px 4px pad, radius 2px; medium → 4px 8px pad, radius 4px.
Variants: live `#0076cc`, unlocked/brand `#e10600`, breaking `#ffd100` (black text),
magenta `#e51073`, secondary ink@10%, ghost variants transparent w/ colored text.

### 5.4 StatusBadge

Inline flex label + trailing 6px round dot in currentColor; colors: neutral/positive/error
(`#e66700`)/dark.

### 5.5 Divider

1px (sm) / 4px / 8px thick; span (vertical, min-h 1rem) or hr (horizontal, min-w 1rem);
grey `surface-neutral-6`, light-grey `surface-neutral-4`, red `#e10600`, transparent white@30%.

### 5.6 DropdownMenu

`<dialog>` opened below trigger (`absolute z-30; mt 12px`). Panel: `border:2px solid ink;
border-radius:8px; flex column` (bg = surface-1); items margined 4px; each item: `padding:8px;
border-radius:8px; border:2px transparent; flex gap-8px items-center`; hover overlay ink@10%;
focus ring = 2px ink border on the item; disabled 50%.

### 5.7 Underline tabs (contextual sub-nav, e.g. Races/Drivers/Teams/Awards)

Equal-column grid (`grid-template-columns: repeat(n,1fr)`), sits flush on a hairline
(`-mb-[1px]`). Each tab: `block py-8px px-16px md:px-24px text-center transition-colors
duration-500`. Idle: text-3 + 1px bottom border `surface-neutral-4`, label
`body-m-compact-semibold` (17px Titillium 600); hover: text-5 + border `surface-neutral-6`.
Selected: text-5, `body-m-compact-bold`, **2px bottom border `#e10600`**; its hover dims to
`accent-hot-red-20`.

### 5.8 Link-with-chevron / link-with-arrow

Footer/quick links: label (`display-s-regular`) + 16px chevron-right SVG, `gap-8px`,
hover `underline decoration-2 underline-offset-2`. Section "View all" links use the
link-ghost button with animated red underline instead. Chevron/caret glyphs are 24×24
viewBox SVGs sized `1em`, `fill:currentColor` (chevron-down for dropdowns, chevron-right
for navigation).

### 5.9 Card baseline

`border-radius:8px; overflow:clip; position:relative`. Media img `object-cover` with
`transition: transform .3s`; **hover: img `scale(1.1)` + title underline**. Focus ring on
the whole card via `:has(title:focus-visible)`. No shadows — cards separate from the page
by surface color (surface-1 on surface-2/3).

### 5.10 Table baseline

Wrapper: bg `surface-1`, radius 8px, `overflow:hidden`, padding 16px 24px (md: 16px 32px,
lg: 24px 32px). Optional full-bleed black header band (`surface-11` bg, `text-1`, negative
margins to bleed to wrapper edge, padding 16px 24/32px). `thead`: 2px bottom border
`surface-neutral-6`, text-3, UPPERCASE. Cells: `padding:16px 24px 16px 4px` (md: right 48px),
left-aligned; body rows separated by 1px `surface-neutral-4`; body text text-5. "Flush"
modifier trims first/last cell padding to 4px. Scrollable-x area wrapper. Footer caption
text-5, padded 16/24px top.

### 5.11 TeamLogo roundel

Circular container bg `surface-neutral-4`, `object-contain` img: sm 20px(icon 16), md 32(24),
lg 40(30), xl 48(36).

### 5.12 RacingLine motif

Decorative wavy-line SVG, `fill:#e10600`, height token 16/24/30/36/45px, stretch to width;
used as horizontal section separators (footer, section breaks).

---

## 6. Tailwind v4 implementation crib

```css
@theme {
  --color-hot-red: #e10600;         --color-hot-red-hover: #ca0500;
  --color-carbon: #15151e;          --color-warm-white: #f7f4f1;
  --color-static-1: #fff;  /* … static ramp per §1.1 … */
  --breakpoint-md: 735px; --breakpoint-lg: 1069px; --breakpoint-xl: 1696px;
  --radius-xs: 2px; --radius-s: 4px; --radius-m: 8px; --radius-l: 16px;
  --font-display: "Formula1", sans-serif;
  --font-body: "Titillium Web", sans-serif;
  --font-digits: "Formula1Digits", monospace;
}
```
- Define the semantic vars (`--surface-1…11`, `--text-1…5`) on `:root`, redefine under
  `@media (prefers-color-scheme: dark)` and under `.dark-section` (mirror of `.f1rd-dark`)
  to force dark chrome bars regardless of theme.
- Container recipe: `w-full` outer + inner `mx-6 md:mx-8 lg:mx-12 xl:mx-auto xl:w-[1600px]`
  (24/32/48px gutters, 1600px cap).
- Load Formula1 weights as 400/500/900 — remember **bold = 500** for this face.
```

Spec complete.
