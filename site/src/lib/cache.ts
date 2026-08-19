import { unstable_cache } from "next/cache";

/**
 * Wrap a DB read in Next's data cache under the given tags. Tag-based
 * invalidation (POST /api/revalidate from the CMS) is the primary mechanism;
 * the time-based revalidate is only a safety net.
 */
export function cached<T>(
  fn: () => Promise<T>,
  keyParts: string[],
  tags: string[],
  revalidate = 300,
): Promise<T> {
  return unstable_cache(fn, keyParts, { tags, revalidate })();
}
