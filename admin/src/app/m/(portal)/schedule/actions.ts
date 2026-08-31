"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, memberRoundRsvps, rounds } from "@ctr/db";
import { requireMember } from "@/lib/member-auth";

const schema = z.object({
  roundId: z.string().uuid(),
  status: z.enum(["going", "maybe", "not_going"]),
  note: z.string().trim().max(280).optional(),
});

/**
 * Records the caller's availability for a race weekend.
 *
 * The member id comes from the session, never the form — otherwise anyone
 * could answer on a colleague's behalf. Upserted on the composite key so
 * changing your mind updates in place rather than accumulating rows.
 */
export async function setRsvpAction(formData: FormData) {
  const session = await requireMember();

  const parsed = schema.safeParse({
    roundId: formData.get("roundId"),
    status: formData.get("status"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) redirect("/m/schedule?status=invalid");

  // Reject ids that do not name a real round rather than relying on the FK to
  // raise, which would surface as a 500.
  const round = await db.query.rounds.findFirst({
    where: eq(rounds.id, parsed.data.roundId),
    columns: { id: true },
  });
  if (!round) redirect("/m/schedule?status=invalid");

  const values = {
    memberId: session.member.id,
    roundId: parsed.data.roundId,
    status: parsed.data.status,
    note: parsed.data.note ?? null,
    updatedAt: new Date(),
  };

  await db
    .insert(memberRoundRsvps)
    .values(values)
    .onConflictDoUpdate({
      target: [memberRoundRsvps.memberId, memberRoundRsvps.roundId],
      set: { status: values.status, note: values.note, updatedAt: values.updatedAt },
    });

  revalidatePath("/m/schedule");
  revalidatePath("/m/roster");
  redirect("/m/schedule?status=saved");
}
