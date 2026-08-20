"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { computeStandings, db, PERMISSIONS, TAGS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { revalidateSite } from "@/lib/revalidate";

export async function recalcStandingsAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.RESULTS_MANAGE);
  const championshipSeasonId = z.string().uuid().parse(formData.get("championshipSeasonId"));

  const summary = await computeStandings(db, championshipSeasonId);

  await writeAudit({
    actorId: session.user.id,
    action: "standings.recalc",
    entityType: "championship_season",
    entityId: championshipSeasonId,
    diff: summary,
  });
  await revalidateSite([TAGS.standings, TAGS.home]);
  revalidatePath("/standings");
}
