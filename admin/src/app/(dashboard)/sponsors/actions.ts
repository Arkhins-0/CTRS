"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, PERMISSIONS, sponsors, TAGS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";

const str = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

const tierSchema = z.enum(["global_partner", "official_partner", "supplier"]);

const sponsorSchema = z.object({
  name: z.string().min(1).max(200),
  tier: tierSchema,
  url: z.string().max(500),
  sort: z.coerce.number().int().min(0),
});

async function invalidate() {
  await revalidateSite([TAGS.sponsors, TAGS.pages]);
  revalidatePath("/sponsors");
}

export async function createSponsorAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const data = sponsorSchema.parse({
    name: str(formData, "name"),
    tier: str(formData, "tier"),
    url: str(formData, "url"),
    sort: str(formData, "sort") || 0,
  });

  const [row] = await db
    .insert(sponsors)
    .values({ name: data.name, tier: data.tier, url: data.url || null, sort: data.sort })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "sponsor.create",
    entityType: "sponsor",
    entityId: row.id,
    diff: { after: data },
  });
  await invalidate();
}

export async function updateSponsorAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const data = sponsorSchema
    .extend({ sponsorId: z.string().uuid(), isActive: z.boolean() })
    .parse({
      sponsorId: str(formData, "sponsorId"),
      name: str(formData, "name"),
      tier: str(formData, "tier"),
      url: str(formData, "url"),
      sort: str(formData, "sort") || 0,
      isActive: formData.get("isActive") === "on",
    });

  const [before] = await db.select().from(sponsors).where(eq(sponsors.id, data.sponsorId));
  if (!before) throw new Error("Sponsor not found");

  await db
    .update(sponsors)
    .set({ name: data.name, tier: data.tier, url: data.url || null, sort: data.sort, isActive: data.isActive })
    .where(eq(sponsors.id, data.sponsorId));

  await writeAudit({
    actorId: session.user.id,
    action: "sponsor.update",
    entityType: "sponsor",
    entityId: data.sponsorId,
    diff: {
      before: { name: before.name, tier: before.tier, url: before.url, sort: before.sort, isActive: before.isActive },
      after: { name: data.name, tier: data.tier, url: data.url, sort: data.sort, isActive: data.isActive },
    },
  });
  await invalidate();
  revalidatePath(`/sponsors/${data.sponsorId}`);
}

export async function toggleSponsorAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const { sponsorId } = z.object({ sponsorId: z.string().uuid() }).parse({ sponsorId: str(formData, "sponsorId") });

  const [before] = await db.select().from(sponsors).where(eq(sponsors.id, sponsorId));
  if (!before) throw new Error("Sponsor not found");

  await db.update(sponsors).set({ isActive: !before.isActive }).where(eq(sponsors.id, sponsorId));

  await writeAudit({
    actorId: session.user.id,
    action: "sponsor.toggle",
    entityType: "sponsor",
    entityId: sponsorId,
    diff: { before: { isActive: before.isActive }, after: { isActive: !before.isActive } },
  });
  await invalidate();
}

export async function deleteSponsorAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const { sponsorId } = z.object({ sponsorId: z.string().uuid() }).parse({ sponsorId: str(formData, "sponsorId") });

  const [before] = await db.select().from(sponsors).where(eq(sponsors.id, sponsorId));
  if (!before) throw new Error("Sponsor not found");

  await db.delete(sponsors).where(eq(sponsors.id, sponsorId));

  await writeAudit({
    actorId: session.user.id,
    action: "sponsor.delete",
    entityType: "sponsor",
    entityId: sponsorId,
    diff: { before: { name: before.name, tier: before.tier } },
  });
  await invalidate();
  redirect("/sponsors");
}
