"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { articles, db, savedArticles } from "@ctr/db";
import { getFanSession } from "@/lib/fan-auth";

/**
 * Toggle an article in the signed-in fan's saved list. Anonymous visitors are
 * sent to /login. Fan-session dependent, so it deliberately bypasses cached().
 */
export async function toggleSaveArticle(articleId: string): Promise<void> {
  const session = await getFanSession();
  if (!session) redirect("/login");

  const [article] = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  if (!article) return;

  const [existing] = await db
    .select({ articleId: savedArticles.articleId })
    .from(savedArticles)
    .where(and(eq(savedArticles.fanId, session.fan.id), eq(savedArticles.articleId, articleId)))
    .limit(1);

  if (existing) {
    await db
      .delete(savedArticles)
      .where(
        and(eq(savedArticles.fanId, session.fan.id), eq(savedArticles.articleId, articleId)),
      );
  } else {
    await db.insert(savedArticles).values({ fanId: session.fan.id, articleId });
  }

  revalidatePath(`/latest/article/${article.slug}`);
}
