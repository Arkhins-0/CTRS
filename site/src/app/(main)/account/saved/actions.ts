"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, savedArticles } from "@ctr/db";
import { requireFan } from "@/lib/fan-auth";

const removeSchema = z.object({ articleId: z.string().uuid() });

export async function removeSavedArticle(formData: FormData): Promise<void> {
  const session = await requireFan();

  const parsed = removeSchema.safeParse({ articleId: formData.get("articleId") });
  if (!parsed.success) return;

  await db
    .delete(savedArticles)
    .where(
      and(
        eq(savedArticles.fanId, session.fan.id),
        eq(savedArticles.articleId, parsed.data.articleId),
      ),
    );

  revalidatePath("/account/saved");
}
