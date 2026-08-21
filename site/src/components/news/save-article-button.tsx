import { and, eq } from "drizzle-orm";
import { Bookmark, BookmarkCheck } from "lucide-react";
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
      <button type="submit" className={`btn btn-sm ${saved ? "btn-tonal" : "btn-stroke"}`}>
        {saved ? (
          <BookmarkCheck size={16} aria-hidden />
        ) : (
          <Bookmark size={16} aria-hidden />
        )}
        {saved ? "Saved" : "Save article"}
      </button>
    </form>
  );
}
