"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { computeStandings, db, PERMISSIONS, TAGS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";

export async function recalcStandingsAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RESULTS_MANAGE);
  const year = z.coerce.number().int().min(1950).max(2100).parse(formData.get("year"));

  const summary = await computeStandings(db, year);

  await writeAudit({
    actorId: session.user.id,
    action: "standings.recalc",
    entityType: "season",
    entityId: String(year),
    diff: summary,
  });
  await revalidateSite([TAGS.standings, TAGS.home]);
  revalidatePath("/standings");
}
