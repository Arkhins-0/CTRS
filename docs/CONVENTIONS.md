# CTRSports — Build Conventions (read fully before writing any page)

Monorepo (npm workspaces): `site/` = public Next.js 15 app (port 3001) · `admin/` = CMS Next.js 15 app (port 3002) · `packages/db` = Drizzle schema + helpers (`@ctr/db`) · `packages/ui` = design tokens + shared components (`@ctr/ui`).

Everything is TypeScript, App Router, React Server Components by default, Tailwind CSS v4.
`params` and `searchParams` are **Promises** in Next 15 — always `await` them.

## Imports contract

```ts
// EVERYTHING db-related comes from the root of @ctr/db (server-side only!):
import {
  db,                       // drizzle client (WebSocket pool, transactions OK)
  // schema tables (all exported): adminUsers, roles, permissions, rolePermissions,
  // adminUserRoles, adminSessions, auditLog, media, articleCategories, articles, tags,
  // articleTags, articleRelated, videos, videoTags, galleries, galleryItems, pages,
  // contentBlocks, sponsors, seasons, circuits, grandsPrix, raceSessions, teams,
  // teamSeasonEntries, cars, drivers, driverSeasonEntries, sessionResults,
  // driverStandings, constructorStandings, fans, fanSessions, fanFavourites,
  // savedArticles, polls, pollOptions, pollVotes, newsletterSubscribers, siteSettings
  TAGS,                     // cache-tag contract (see below)
  computeStandings,         // recompute standings snapshots for a season
  pointsForPosition,        // points from a scheme array + position
  formatLapTime, formatRaceTime, formatGap, parseTimeToMs, // time helpers
  PERMISSIONS, type Permission, ROLES, ROLE_DEFINITIONS,
} from "@ctr/db";
// In CLIENT components never import "@ctr/db" (it opens a DB pool). If a client
// component needs PERMISSIONS use the safe subpath: import { PERMISSIONS } from "@ctr/db/permissions";

import { ChamferCard, TeamColorBar, Badge, CountryFlag, SectionHeading } from "@ctr/ui";
```

Drizzle: relational queries are configured — `db.query.articles.findMany({ with: { hero: true, category: true } })` works for all tables (see relations in `packages/db/src/schema/*.ts`). Use `eq, and, desc, asc, count, sql, inArray, isNull, gte, lte, like, ilike` from `"drizzle-orm"`.

### site/ helpers
```ts
import { cached } from "@/lib/cache";           // cached(fn, keyParts, tags, revalidateSeconds?)
import { mediaUrl, placeholderStyle } from "@/lib/media"; // S3 key -> URL; gradient fallback style
import { getSetting, getCurrentSeasonYear } from "@/lib/settings";
import { getFanSession, requireFan, createFanSession, destroyFanSession } from "@/lib/fan-auth";
```
Wrap EVERY public-site DB read in `cached(...)` with the right TAGS (exception: fan-zone pages, which are `export const dynamic = "force-dynamic"` and read directly).

### admin/ helpers
```ts
import { requirePermission, requireAdmin, getAdminSession, checkPermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";      // revalidateSite([TAGS.articles, ...])
import { putObject, deleteObject, publicUrl } from "@/lib/storage"; // S3
import { Button, LinkButton, Input, Textarea, Select, Field, Card, PageHeader, Table, EmptyState, StatusPill } from "@/components/ui";
import { SubmitButton, ConfirmSubmit } from "@/components/ui-client"; // client, for <form action={...}>
```

## The admin mutation pattern (EVERY server action)

```ts
"use server";
export async function saveThing(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NEWS_MANAGE); // 1. RBAC gate
  const data = schema.parse({...});                                 // 2. zod validate
  const [row] = await db.insert(...).returning();                   // 3. mutation (db.transaction for multi-step)
  await writeAudit({ actorId: session.user.id, action: "article.create", entityType: "article", entityId: row.id, diff: { after: data } }); // 4. audit
  await revalidateSite([TAGS.articles, TAGS.home]);                 // 5. invalidate public site
  revalidatePath("/news");                                          // 6. refresh admin UI
  redirect(`/news/${row.id}`);                                      // (or return state)
}
```
Admin pages that read data: `export const dynamic = "force-dynamic";` (no caching in the CMS).

## Cache tags (TAGS from @ctr/db)

`TAGS.home` `TAGS.settings` `TAGS.articles` `TAGS.article(slug)` `TAGS.videos` `TAGS.video(slug)` `TAGS.galleries` `TAGS.schedule` `TAGS.gp(id)` `TAGS.results` `TAGS.resultsSession(sessionId)` `TAGS.standings` `TAGS.drivers` `TAGS.driver(slug)` `TAGS.teams` `TAGS.team(slug)` `TAGS.pages` `TAGS.page(slug)` `TAGS.sponsors` `TAGS.polls`

Mutating X ⇒ revalidate the list tag + the detail tag + `TAGS.home` when it appears on the homepage (articles, standings, schedule, polls).

## Schema cheat-sheet (key columns only)

- **seasons**: year(PK int), isCurrent, racePoints int[], sprintPoints int[]
- **circuits**: id, slug, name, locality, country, countryCode, lengthKm, raceLaps, lapRecordTimeMs, lapRecordDriver, lapRecordYear, firstGpYear, description, mapMediaId
- **grandsPrix**: id, seasonYear, round, slug, name, officialName, circuitId, startDate, endDate, hasSprint, status(scheduled|live|completed|cancelled), heroMediaId — unique(seasonYear, round), unique(seasonYear, slug)
- **raceSessions**: id, grandPrixId, type(fp1|fp2|fp3|sprint_qualifying|sprint|qualifying|race), startsAt, endsAt, status(scheduled|live|completed|cancelled) — unique(gp,type)
- **teams**: id, slug, name, fullName, base, countryCode, firstEntryYear, worldChampionships, description, logoMediaId
- **teamSeasonEntries**: id, teamId, seasonYear, displayName, shortName, primaryColor, secondaryColor, teamPrincipal, powerUnitSupplier, logoMediaId, carImageMediaId — unique(teamId, seasonYear). Relation `car` (one), `driverEntries` (many), `team` (one)
- **cars**: id, teamSeasonEntryId(unique), modelName, chassis, powerUnit, specs jsonb, imageMediaId
- **drivers**: id, slug, firstName, lastName, code(3), countryCode, dateOfBirth, placeOfBirth, biography, headshotMediaId, isActive
- **driverSeasonEntries**: id, driverId, teamSeasonEntryId, seasonYear, carNumber, role(primary|reserve), fromRound?, toRound? (null = season start/end). Relations: driver, teamSeasonEntry, results
- **sessionResults**: id, sessionId, driverSeasonEntryId, position?, status(finished|dnf|dns|dsq|nc), gridPosition?, laps?, timeMs?, gapMs?, lapsBehind?, q1TimeMs?, q2TimeMs?, q3TimeMs?, points, fastestLap, fastestLapTimeMs? — unique(sessionId, driverSeasonEntryId). Relations: session, entry
- **driverStandings / constructorStandings**: seasonYear, driverId/teamSeasonEntryId, position, points, wins, podiums(driver), poles(driver), computedThroughRound — snapshots; NEVER write directly, call `computeStandings(db, year)`
- **media**: id, kind(image|file|video), path(S3 key), filename, mime, width, height, sizeBytes, alt, caption, credit, uploadedBy
- **articles**: id, slug, title, standfirst, heroMediaId, categoryId, body(jsonb TipTap), bodyHtml, status(draft|scheduled|published|archived), publishedAt, scheduledFor, authorId, authorNameOverride, isBreaking. Relations: hero, category, author, articleTags
- **articleCategories**: id(serial), slug, name, sort · **tags**: id, slug, name · **articleTags/videoTags**: join tables · **articleRelated**: articleId, relatedArticleId, sort
- **videos**: id, slug, title, description, provider(youtube|file), externalId, mediaId, thumbnailMediaId, durationSeconds, status, publishedAt
- **galleries** + **galleryItems**(galleryId, mediaId, sort, captionOverride)
- **pages**: id, slug, title, metaTitle, metaDescription, ogMediaId, status, updatedBy · **contentBlocks**: id, pageId, type(hero|rich_text|image|image_grid|cta|faq|sponsor_grid|raw_html), sort, data jsonb
- **sponsors**: id, name, tier(global_partner|official_partner|supplier), logoMediaId, url, sort, isActive
- **fans**: id, email, passwordHash, displayName, countryCode, deactivatedAt(null=active), emailVerifiedAt · **fanFavourites**(fanId, entityType driver|team, entityId) · **savedArticles**(fanId, articleId)
- **polls**: id, slug, question, kind(poll|prediction), grandPrixId?, status(draft|open|closed), opensAt, closesAt · **pollOptions**: id, pollId, label, driverId?, sort · **pollVotes**: PK(pollId, fanId), optionId
- **newsletterSubscribers**: id, email, fanId?, status(pending|confirmed|unsubscribed), confirmToken, confirmedAt, source
- **siteSettings**: key(PK), value jsonb — keys: current_season {year}, nav_links, social_links, footer_links, broadcast_banner
- **adminUsers**: id, email, passwordHash, displayName, isActive, failedLogins, lastLoginAt · **roles**(key,name) · **permissions**(key) · **rolePermissions** · **adminUserRoles** · **auditLog**: id, adminUserId, action, entityType, entityId, diff jsonb, createdAt

Active driver entry for round N: `fromRound == null || fromRound <= N` AND `toRound == null || toRound >= N`.

## Visual language (both apps — F1.com look)

Tokens (Tailwind classes): colors `f1-red #E10600`, `f1-red-dark`, `carbon #15151E` (+ `carbon-900/800/700/600`), `off-white #F7F4F1`, `warm-grey #E8E4E1`, `f1-grey #67676D`, `f1-grey-light`. Utilities: `chamfer-tr`, `chamfer-br`, `chamfer-both`, `chamfer-tr-lg` (F1 cut corners), `bg-carbon-fibre`.

- Headings: `font-black uppercase tracking-tight`, sections use `<SectionHeading>` (red left kick).
- Cards: white bg, `chamfer-tr`, subtle border `border-warm-grey`, hover lift. Dark surfaces: `bg-carbon` with white text.
- Tables (standings/results): dark carbon header row, white body rows, `TeamColorBar color={entry.teamSeasonEntry.primaryColor}` beside driver names, positions in `font-black`.
- Driver/team cards: number + last name big, team-colored top border or bar, `CountryFlag code={...}`.
- Buttons/links: red primary, uppercase bold small text.
- Images: `next/image` with `mediaUrl(media?.path)`; when null use `<div style={placeholderStyle(name)}>` gradient with initials/text.
- Site page container: `<main className="mx-auto max-w-7xl px-4 py-8">`.

## Hard rules

1. Do NOT modify shared files (layouts, `lib/*`, `components/ui*`, schema, package.json, configs) — create new files inside your assigned scope only.
2. Do NOT run dev servers, builds, npm install, or db commands. There is no live DB yet — write code that will work once seeded.
3. Every admin mutation follows the 6-step pattern above. No mutation without `requirePermission` + `writeAudit` + `revalidateSite`.
4. Fan/session pages: `export const dynamic = "force-dynamic"`. Public cached pages: rely on `cached()` tags.
5. bcryptjs for password hashing (`hashSync(pw, 12)` / `compareSync`).
6. date-fns for dates (`format(date, "d MMM yyyy")`), times shown in user-local time via a small client component when needed.
7. Use `notFound()` from "next/navigation" for missing slugs. Add `generateMetadata` for public detail pages.
8. Keep every file compilable TypeScript-strict. No `any` unless unavoidable (jsonb).
