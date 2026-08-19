"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, fans, fanSessions, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const fanIdSchema = z.object({ fanId: z.string().uuid() });

export async function deactivateFanAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.FANS_VIEW);
  const { fanId } = fanIdSchema.parse({ fanId: String(formData.get("fanId") ?? "") });

  const [fan] = await db.select().from(fans).where(eq(fans.id, fanId));
  if (!fan) throw new Error("Fan not found");
  if (fan.deactivatedAt) return; // already deactivated

  await db.transaction(async (tx) => {
    await tx.update(fans).set({ deactivatedAt: new Date() }).where(eq(fans.id, fanId));
    await tx.delete(fanSessions).where(eq(fanSessions.fanId, fanId)); // log them out everywhere
  });

  await writeAudit({
    actorId: session.user.id,
    action: "fan.deactivate",
    entityType: "fan",
    entityId: fanId,
    diff: { before: { deactivatedAt: null }, after: { deactivatedAt: new Date().toISOString() } },
  });
  revalidatePath("/fans");
}

export async function reactivateFanAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.FANS_VIEW);
  const { fanId } = fanIdSchema.parse({ fanId: String(formData.get("fanId") ?? "") });

  const [fan] = await db.select().from(fans).where(eq(fans.id, fanId));
  if (!fan) throw new Error("Fan not found");
  if (!fan.deactivatedAt) return; // already active

  await db.update(fans).set({ deactivatedAt: null }).where(eq(fans.id, fanId));

  await writeAudit({
    actorId: session.user.id,
    action: "fan.reactivate",
    entityType: "fan",
    entityId: fanId,
    diff: { before: { deactivatedAt: fan.deactivatedAt.toISOString() }, after: { deactivatedAt: null } },
  });
  revalidatePath("/fans");
}
