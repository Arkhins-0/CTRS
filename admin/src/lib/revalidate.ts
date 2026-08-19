/**
 * Cross-app cache bridge: the public site caches DB reads under tags; every
 * CMS mutation calls this to invalidate the affected tags over HTTP.
 */
export async function revalidateSite(tags: string[]) {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) return;
  try {
    await fetch(`${siteUrl}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: process.env.REVALIDATE_SECRET, tags }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("revalidateSite failed (is the site running?)", err);
  }
}
