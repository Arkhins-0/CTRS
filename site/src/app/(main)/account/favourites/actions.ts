"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, drivers, fanFavourites, teams } from "@ctr/db";
import { requireFan } from "@/lib/fan-auth";

const setSchema = z.object({
  entityType: z.enum(["driver", "team"]),
  entityId: z.string().uuid(),
});

/** Replaces the fan's existing favourite of that type (delete then insert). */
export async function setFavourite(formData: FormData): Promise<void> {
  const session = await requireFan();

  const parsed = setSchema.safeParse({
    entityType: formData.get("entityType"),
    entityId: formData.get("entityId"),
  });
  if (!parsed.success) return;
  const { entityType, entityId } = parsed.data;

  // make sure the picked entity actually exists
  const exists =
    entityType === "driver"
      ? await db.query.drivers.findFirst({
          where: eq(drivers.id, entityId),
          columns: { id: true },
        })
      : await db.query.teams.findFirst({
          where: eq(teams.id, entityId),
          columns: { id: true },
        });
  if (!exists) return;

  await db.transaction(async (tx) => {
    await tx
      .delete(fanFavourites)
      .where(
        and(eq(fanFavourites.fanId, session.fan.id), eq(fanFavourites.entityType, entityType)),
      );
    await tx.insert(fanFavourites).values({ fanId: session.fan.id, entityType, entityId });
  });

  revalidatePath("/account/favourites");
}

const removeSchema = z.object({ entityType: z.enum(["driver", "team"]) });

export async function removeFavourite(formData: FormData): Promise<void> {
  const session = await requireFan();

  const parsed = removeSchema.safeParse({ entityType: formData.get("entityType") });
  if (!parsed.success) return;

  await db
    .delete(fanFavourites)
    .where(
      and(
        eq(fanFavourites.fanId, session.fan.id),
        eq(fanFavourites.entityType, parsed.data.entityType),
      ),
    );

  revalidatePath("/account/favourites");
}
