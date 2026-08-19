# CTR Sports — Formula1.com-style site + Admin CMS

A complete recreation of a Formula 1 championship site with real 2025–2026 data, plus a separate
role-based admin CMS that manages everything on it.

| App | Folder | Port | What it is |
|---|---|---|---|
| Public site | `site/` | **3001** | News, schedule, results, standings, drivers, teams, video, fan zone |
| Admin CMS | `admin/` | **3002** | Articles (with Word import), race weekends, results entry, standings recalc, teams/drivers/cars, media library (S3), pages, polls, newsletter, admins & roles, audit log |
| Shared DB | `packages/db` | — | Drizzle schema, NeonDB client, points/standings engine, seed with real F1 data |
| Shared UI | `packages/ui` | — | F1 design tokens (red/carbon/chamfers) + shared components |

## 1. Prerequisites

- Node 20.11+ (Node 24 recommended) and npm 10+
- A [Neon](https://neon.tech) Postgres database
- An AWS S3 bucket for media (public read)

## 2. Setup

```bash
npm install
```

Fill in the root **`.env`** (see `.env.example`):

- `DATABASE_URL` — Neon **pooled** connection string
- `DATABASE_URL_UNPOOLED` — Neon **direct** connection string (migrations + seed)
- `ADMIN_SESSION_SECRET`, `FAN_SESSION_SECRET`, `REVALIDATE_SECRET` — any long random strings
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` — the super-admin login the seed creates

S3 bucket policy for public read (replace `BUCKET`):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadMedia",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::BUCKET/media/*"
  }]
}
```
(Also disable "Block all public access" for the bucket, or front it with CloudFront and point
`S3_PUBLIC_URL` at the distribution instead.)

## 3. Database: migrate + seed real F1 data

```bash
npm run db:migrate      # applies packages/db/drizzle/*.sql to Neon
npm run db:seed         # seeds RBAC + real 2025 & 2026 data + content
```

The seed reads JSON snapshots in `packages/db/src/seed/data/` (already committed), which were
fetched from the [Jolpica F1 API](https://api.jolpi.ca) (Ergast-compatible). It inserts:

- Roles, permissions, and your super-admin account
- Seasons 2025 (complete — all 24 rounds) & 2026 (all completed rounds so far), circuits,
  teams + per-season entries + cars, drivers + season entries (mid-season swaps included),
  every GP + session with real times, full race/sprint/qualifying classifications
- Driver & constructor standings **computed from the seeded results** and verified against the
  official standings (the seed prints a ✓ or per-driver mismatches)
- Sample articles, CMS pages, sponsors, site settings, and an open prediction poll

Re-running the seed is safe: racing data is wiped-and-rebuilt per season; content/settings are
insert-if-missing (your CMS edits survive).

**Refresh with the latest real results** any time:

```bash
npm run db:fetch-data   # re-pulls 2025+2026 from the API into JSON files
npm run db:seed
```

## 4. Run

```bash
npm run dev             # site on :3001 + admin on :3002 together
```

- Site: http://localhost:3001
- CMS: http://localhost:3002 — sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`

## 5. Admin roles (RBAC)

Multiple admins can hold multiple roles; every server action re-checks permissions and writes an
audit-log row.

| Role | Can manage |
|---|---|
| Super Admin | everything, incl. admin users & site settings |
| Manager | everything except admins & settings |
| News Editor | articles, categories, tags (+ media picker) |
| Race Editor | race weekends, circuits, results entry, standings recalc |
| Team Manager | teams, season entries, cars |
| Driver Manager | drivers & season entries |
| Media Manager | media library, videos, galleries |
| Page Editor | CMS pages, blocks, sponsors |
| Fan Zone Editor | polls/predictions, fan list, newsletter |

## 6. How the two apps stay in sync

The public site caches DB reads under tags (`unstable_cache`). Every CMS mutation POSTs
`{ secret, tags }` to the site's `/api/revalidate`, so edits appear on the public site instantly
while pages stay statically cached between edits. Standings are stored snapshots recomputed by
`computeStandings()` whenever results are published (deterministic — pure aggregation of
`session_results.points`).

## 7. Word (.docx) article import

In the CMS article editor, **Import .docx** converts a Word file to rich text via `mammoth`
(headings, quotes, lists, tables preserved), pipes every embedded image through `sharp` → S3 →
media library, sanitises the HTML, and loads it into the TipTap editor for further editing.

## 8. Notes

- Car model names for 2026 and team colours/principals live in
  `packages/db/src/seed/static-data.ts` — everything is editable in the CMS afterwards.
- The official "Formula 1" typeface is licensed; the site uses Titillium Web as a free stand-in.
  Don't ship official F1 logos/trademarks as your own branding.
- Media originals + `_hero`/`_card`/`_thumb` webp variants are stored under
  `media/{yyyy}/{mm}/` in the bucket.
- Newsletter email sending is not wired to a provider; double-opt-in links are shown on screen in
  dev. Plug an email service into the subscribe actions when needed.
