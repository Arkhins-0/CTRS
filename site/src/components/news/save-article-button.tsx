import { and, eq } from "drizzle-orm";
import { db, savedArticles } from "@ctr/db";
import { toggleSaveArticle } from "@/app/(main)/latest/article/save-action";
import { getFanSession } from "@/lib/fan-auth";

/**
 * Fan-session-aware save/unsave toggle. Deliberately NOT wrapped in cached():
 * the state is per-fan, so it reads the session and saved_articles directly.
 */
export async function SaveArticleButton({ articleId }: { articleId: string }) {
  const session = await getFanSession();

  let saved = false;
  if (session) {
    const [row] = await db
      .select({ articleId: savedArticles.articleId })
      .from(savedArticles)
      .where(
        and(eq(savedArticles.fanId, session.fan.id), eq(savedArticles.articleId, articleId)),
      )
      .limit(1);
    saved = Boolean(row);
  }

  return (
    <form action={toggleSaveArticle.bind(null, articleId)}>
      <button
        type="submit"
        className={`chamfer-tr px-5 py-2 text-xs font-black uppercase tracking-wide transition-colors ${
          saved
            ? "border border-line bg-panel text-white hover:bg-surface"
            : "bg-accent text-accent-fg hover:bg-accent-dark"
        }`}
      >
        {saved ? "Saved ✓" : "Save article"}
      </button>
    </form>
  );
}
