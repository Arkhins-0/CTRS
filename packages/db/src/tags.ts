/**
 * Cache-tag contract shared by the public site (unstable_cache tags) and the
 * admin CMS (revalidateSite calls). Keep every tag here so the two apps can
 * never drift apart.
 */
export const TAGS = {
  home: "home",
  settings: "settings",
  articles: "articles",
  article: (slug: string) => `article:${slug}`,
  videos: "videos",
  video: (slug: string) => `video:${slug}`,
  galleries: "galleries",
  schedule: "schedule",
  gp: (id: string) => `gp:${id}`,
  results: "results",
  resultsSession: (sessionId: string) => `results:${sessionId}`,
  standings: "standings",
  drivers: "drivers",
  driver: (slug: string) => `driver:${slug}`,
  teams: "teams",
  team: (slug: string) => `team:${slug}`,
  pages: "pages",
  page: (slug: string) => `page:${slug}`,
  sponsors: "sponsors",
  polls: "polls",
} as const;
