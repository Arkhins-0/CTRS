"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, polls, pollVotes } from "@ctr/db";
import { requireFan } from "@/lib/fan-auth";

const voteSchema = z.object({
  pollId: z.string().uuid(),
  optionId: z.string().uuid(),
});

/** One vote per fan per poll — voting again switches the fan's option. */
export async function votePoll(formData: FormData): Promise<void> {
  const session = await requireFan(); // redirects to /login when signed out

  const parsed = voteSchema.safeParse({
    pollId: formData.get("pollId"),
    optionId: formData.get("optionId"),
  });
  if (!parsed.success) return;
  const { pollId, optionId } = parsed.data;

  const poll = await db.query.polls.findFirst({
    where: eq(polls.id, pollId),
    with: { options: { columns: { id: true } } },
  });
  if (!poll || poll.status !== "open") return;
  if (!poll.options.some((o) => o.id === optionId)) return;

  await db
    .insert(pollVotes)
    .values({ pollId, fanId: session.fan.id, optionId })
    .onConflictDoUpdate({
      target: [pollVotes.pollId, pollVotes.fanId],
      set: { optionId },
    });

  revalidatePath("/polls");
}
