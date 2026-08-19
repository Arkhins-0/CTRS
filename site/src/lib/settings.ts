import { eq } from "drizzle-orm";
import { db, siteSettings, TAGS } from "@ctr/db";
import { cached } from "./cache";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  return cached(
    async () => {
      const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
      return (row?.value as T) ?? fallback;
    },
    ["setting", key],
    [TAGS.settings],
    3600,
  );
}

export async function getCurrentSeasonYear(): Promise<number> {
  const v = await getSetting<{ year: number }>("current_season", { year: 2026 });
  return v.year;
}
