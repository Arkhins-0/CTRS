"use server";

import { eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, PERMISSIONS, pollOptions, polls, TAGS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";

const str = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

const dateTimeLocal = z
  .string()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Invalid date");

const pollSchema = z.object({
  question: z.string().min(1).max(500),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  kind: z.enum(["poll", "prediction"]),
  grandPrixId: z.string().uuid().nullable(),
  opensAt: dateTimeLocal,
  closesAt: dateTimeLocal,
});

async function invalidate(pollId?: string) {
  await revalidateSite([TAGS.polls, TAGS.home]);
  revalidatePath("/polls");
  if (pollId) revalidatePath(`/polls/${pollId}`);
}

/* ── polls ───────────────────────────────────────────────────────────────── */

export async function createPollAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.FANZONE_MANAGE);
  const question = str(formData, "question");
  const data = pollSchema.parse({
    question,
    slug: str(formData, "slug") || slugify(question),
    kind: str(formData, "kind"),
    grandPrixId: str(formData, "grandPrixId") || null,
    opensAt: str(formData, "opensAt"),
    closesAt: str(formData, "closesAt"),
  });

  const [row] = await db
    .insert(polls)
    .values({
      question: data.question,
      slug: data.slug,
      kind: data.kind,
      grandPrixId: data.grandPrixId,
      opensAt: data.opensAt,
      closesAt: data.closesAt,
      status: "draft",
      createdBy: session.user.id,
    })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "poll.create",
    entityType: "poll",
    entityId: row.id,
    diff: { after: { question: data.question, slug: data.slug, kind: data.kind } },
  });
  await invalidate();
  redirect(`/polls/${row.id}`);
}

export async function updatePollAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.FANZONE_MANAGE);
  const data = pollSchema.extend({ pollId: z.string().uuid() }).parse({
    pollId: str(formData, "pollId"),
    question: str(formData, "question"),
    slug: str(formData, "slug"),
    kind: str(formData, "kind"),
    grandPrixId: str(formData, "grandPrixId") || null,
    opensAt: str(formData, "opensAt"),
    closesAt: str(formData, "closesAt"),
  });

  const [before] = await db.select().from(polls).where(eq(polls.id, data.pollId));
  if (!before) throw new Error("Poll not found");

  await db
    .update(polls)
    .set({
      question: data.question,
      slug: data.slug,
      kind: data.kind,
      grandPrixId: data.grandPrixId,
      opensAt: data.opensAt,
      closesAt: data.closesAt,
    })
    .where(eq(polls.id, data.pollId));

  await writeAudit({
    actorId: session.user.id,
    action: "poll.update",
    entityType: "poll",
    entityId: data.pollId,
    diff: {
      before: {
        question: before.question,
        slug: before.slug,
        kind: before.kind,
        grandPrixId: before.grandPrixId,
        opensAt: before.opensAt,
        closesAt: before.closesAt,
      },
      after: data,
    },
  });
  await invalidate(data.pollId);
}

export async function setPollStatusAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.FANZONE_MANAGE);
  const { pollId, status } = z
    .object({ pollId: z.string().uuid(), status: z.enum(["draft", "open", "closed"]) })
    .parse({ pollId: str(formData, "pollId"), status: str(formData, "status") });

  const [before] = await db.select().from(polls).where(eq(polls.id, pollId));
  if (!before) throw new Error("Poll not found");

  await db
    .update(polls)
    .set({
      status,
      opensAt: status === "open" && !before.opensAt ? new Date() : before.opensAt,
      closesAt: status === "closed" ? new Date() : before.closesAt,
    })
    .where(eq(polls.id, pollId));

  await writeAudit({
    actorId: session.user.id,
    action: "poll.status",
    entityType: "poll",
    entityId: pollId,
    diff: { before: { status: before.status }, after: { status } },
  });
  await invalidate(pollId);
}

export async function deletePollAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.FANZONE_MANAGE);
  const { pollId } = z.object({ pollId: z.string().uuid() }).parse({ pollId: str(formData, "pollId") });

  const [before] = await db.select().from(polls).where(eq(polls.id, pollId));
  if (!before) throw new Error("Poll not found");

  await db.delete(polls).where(eq(polls.id, pollId)); // options + votes cascade

  await writeAudit({
    actorId: session.user.id,
    action: "poll.delete",
    entityType: "poll",
    entityId: pollId,
    diff: { before: { question: before.question, slug: before.slug, status: before.status } },
  });
  await invalidate();
  redirect("/polls");
}

/* ── options ─────────────────────────────────────────────────────────────── */

export async function addPollOptionAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.FANZONE_MANAGE);
  const data = z
    .object({
      pollId: z.string().uuid(),
      label: z.string().min(1).max(255),
      driverId: z.string().uuid().nullable(),
    })
    .parse({
      pollId: str(formData, "pollId"),
      label: str(formData, "label"),
      driverId: str(formData, "driverId") || null,
    });

  const [{ m }] = await db
    .select({ m: max(pollOptions.sort) })
    .from(pollOptions)
    .where(eq(pollOptions.pollId, data.pollId));

  const [row] = await db
    .insert(pollOptions)
    .values({ pollId: data.pollId, label: data.label, driverId: data.driverId, sort: (m ?? -1) + 1 })
    .returning();

  await writeAudit({
    actorId: session.user.id,
    action: "poll.option-add",
    entityType: "poll_option",
    entityId: row.id,
    diff: { after: { pollId: data.pollId, label: data.label, driverId: data.driverId, sort: row.sort } },
  });
  await invalidate(data.pollId);
}

export async function updatePollOptionAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.FANZONE_MANAGE);
  const data = z
    .object({
      optionId: z.string().uuid(),
      label: z.string().min(1).max(255),
      driverId: z.string().uuid().nullable(),
      sort: z.coerce.number().int().min(0),
    })
    .parse({
      optionId: str(formData, "optionId"),
      label: str(formData, "label"),
      driverId: str(formData, "driverId") || null,
      sort: str(formData, "sort") || 0,
    });

  const [before] = await db.select().from(pollOptions).where(eq(pollOptions.id, data.optionId));
  if (!before) throw new Error("Option not found");

  await db
    .update(pollOptions)
    .set({ label: data.label, driverId: data.driverId, sort: data.sort })
    .where(eq(pollOptions.id, data.optionId));

  await writeAudit({
    actorId: session.user.id,
    action: "poll.option-update",
    entityType: "poll_option",
    entityId: data.optionId,
    diff: {
      before: { label: before.label, driverId: before.driverId, sort: before.sort },
      after: { label: data.label, driverId: data.driverId, sort: data.sort },
    },
  });
  await invalidate(before.pollId);
}

export async function removePollOptionAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.FANZONE_MANAGE);
  const { optionId } = z.object({ optionId: z.string().uuid() }).parse({ optionId: str(formData, "optionId") });

  const [before] = await db.select().from(pollOptions).where(eq(pollOptions.id, optionId));
  if (!before) throw new Error("Option not found");

  await db.delete(pollOptions).where(eq(pollOptions.id, optionId)); // votes cascade

  await writeAudit({
    actorId: session.user.id,
    action: "poll.option-remove",
    entityType: "poll_option",
    entityId: optionId,
    diff: { before: { pollId: before.pollId, label: before.label } },
  });
  await invalidate(before.pollId);
}
