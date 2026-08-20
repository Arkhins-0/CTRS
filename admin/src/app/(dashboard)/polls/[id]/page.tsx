import { notFound } from "next/navigation";
import { format } from "date-fns";
import { asc, count, eq } from "drizzle-orm";
import { db, drivers, PERMISSIONS, pollOptions, polls, pollVotes } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, Field, Input, LinkButton, PageHeader, Select, StatusPill } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { loadRoundOptions } from "@/components/racing/round-options";
import {
  addPollOptionAction,
  deletePollAction,
  removePollOptionAction,
  setPollStatusAction,
  updatePollAction,
  updatePollOptionAction,
} from "../actions";

export const dynamic = "force-dynamic";

const toLocalInput = (d: Date | null) => (d ? format(d, "yyyy-MM-dd'T'HH:mm") : "");

export default async function PollEditor({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.FANZONE_MANAGE);
  const { id } = await params;

  const poll = await db.query.polls.findFirst({
    where: eq(polls.id, id),
    with: { options: { orderBy: [asc(pollOptions.sort), asc(pollOptions.label)] } },
  });
  if (!poll) notFound();

  const [roundOptions, activeDrivers, voteRows] = await Promise.all([
    loadRoundOptions(),
    db
      .select({ id: drivers.id, firstName: drivers.firstName, lastName: drivers.lastName, code: drivers.code })
      .from(drivers)
      .where(eq(drivers.isActive, true))
      .orderBy(asc(drivers.lastName), asc(drivers.firstName)),
    db
      .select({ optionId: pollVotes.optionId, n: count() })
      .from(pollVotes)
      .where(eq(pollVotes.pollId, id))
      .groupBy(pollVotes.optionId),
  ]);

  const votesByOption = new Map(voteRows.map((r) => [r.optionId, r.n]));
  const totalVotes = voteRows.reduce((sum, r) => sum + r.n, 0);

  const DriverSelect = ({ name, defaultValue }: { name: string; defaultValue: string }) => (
    <Select name={name} defaultValue={defaultValue}>
      <option value="">— No driver —</option>
      {activeDrivers.map((d) => (
        <option key={d.id} value={d.id}>
          {d.code} · {d.firstName} {d.lastName}
        </option>
      ))}
    </Select>
  );

  return (
    <>
      <PageHeader
        title={poll.question}
        sub={`${poll.kind} · /${poll.slug}`}
        actions={
          <>
            <StatusPill status={poll.status} />
            <LinkButton href="/polls" variant="ghost">← All polls</LinkButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Poll fields */}
          <Card>
            <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Poll details</h2>
            <form action={updatePollAction} className="space-y-4">
              <input type="hidden" name="pollId" value={poll.id} />
              <Field label="Question">
                <Input name="question" required maxLength={500} defaultValue={poll.question} />
              </Field>
              <Field label="Slug">
                <Input name="slug" required pattern="[a-z0-9-]+" maxLength={200} defaultValue={poll.slug} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kind">
                  <Select name="kind" defaultValue={poll.kind}>
                    <option value="poll">Poll</option>
                    <option value="prediction">Prediction</option>
                  </Select>
                </Field>
                <Field label="Round">
                  <Select name="roundId" defaultValue={poll.roundId ?? ""}>
                    <option value="">— None —</option>
                    {roundOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Opens at">
                  <Input name="opensAt" type="datetime-local" defaultValue={toLocalInput(poll.opensAt)} />
                </Field>
                <Field label="Closes at">
                  <Input name="closesAt" type="datetime-local" defaultValue={toLocalInput(poll.closesAt)} />
                </Field>
              </div>
              <SubmitButton>Save poll</SubmitButton>
            </form>
          </Card>

          {/* Options manager */}
          <Card>
            <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Options</h2>
            {poll.options.length ? (
              <ul className="space-y-3">
                {poll.options.map((opt) => (
                  <li key={opt.id} className="flex flex-wrap items-end gap-3 border-b border-warm-grey pb-3">
                    <form action={updatePollOptionAction} className="flex flex-1 flex-wrap items-end gap-3">
                      <input type="hidden" name="optionId" value={opt.id} />
                      <Field label="Label" className="min-w-40 flex-1">
                        <Input name="label" required maxLength={255} defaultValue={opt.label} />
                      </Field>
                      <Field label="Driver" className="w-52">
                        <DriverSelect name="driverId" defaultValue={opt.driverId ?? ""} />
                      </Field>
                      <Field label="Sort" className="w-20">
                        <Input name="sort" type="number" min={0} defaultValue={opt.sort} />
                      </Field>
                      <SubmitButton variant="secondary" className="px-3 py-2">Save</SubmitButton>
                    </form>
                    <form action={removePollOptionAction} className="pb-0.5">
                      <input type="hidden" name="optionId" value={opt.id} />
                      <ConfirmSubmit message={`Remove option "${opt.label}"? Its votes are removed too.`}>
                        Remove
                      </ConfirmSubmit>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-f1-grey">No options yet — fans can't vote until you add some.</p>
            )}

            <form action={addPollOptionAction} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="pollId" value={poll.id} />
              <Field label="New option" className="min-w-40 flex-1">
                <Input name="label" required maxLength={255} placeholder="Option label" />
              </Field>
              <Field label="Driver" className="w-52">
                <DriverSelect name="driverId" defaultValue="" />
              </Field>
              <SubmitButton>Add option</SubmitButton>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Status actions */}
          <Card>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Status</h2>
            <div className="flex flex-wrap gap-2">
              {poll.status !== "open" && (
                <form action={setPollStatusAction}>
                  <input type="hidden" name="pollId" value={poll.id} />
                  <input type="hidden" name="status" value="open" />
                  <SubmitButton>Open now</SubmitButton>
                </form>
              )}
              {poll.status !== "closed" && (
                <form action={setPollStatusAction}>
                  <input type="hidden" name="pollId" value={poll.id} />
                  <input type="hidden" name="status" value="closed" />
                  <SubmitButton variant="secondary">Close now</SubmitButton>
                </form>
              )}
              {poll.status !== "draft" && (
                <form action={setPollStatusAction}>
                  <input type="hidden" name="pollId" value={poll.id} />
                  <input type="hidden" name="status" value="draft" />
                  <SubmitButton variant="secondary">Back to draft</SubmitButton>
                </form>
              )}
            </div>
            <p className="mt-3 text-xs text-f1-grey-light">
              Opening sets "opens at" to now when empty · closing stamps "closes at".
            </p>
          </Card>

          {/* Results */}
          <Card>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Results</h2>
            {poll.options.length ? (
              <>
                <ul className="space-y-3">
                  {poll.options.map((opt) => {
                    const n = votesByOption.get(opt.id) ?? 0;
                    const pct = totalVotes ? Math.round((n / totalVotes) * 100) : 0;
                    return (
                      <li key={opt.id}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                          <span className="truncate font-bold">{opt.label}</span>
                          <span className="whitespace-nowrap text-xs text-f1-grey">
                            {n} · {pct}%
                          </span>
                        </div>
                        <div className="h-4 w-full bg-warm-grey">
                          <div className="h-full bg-f1-red" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 border-t border-warm-grey pt-3 text-sm">
                  <span className="font-black">{totalVotes}</span>{" "}
                  <span className="text-f1-grey">total vote{totalVotes === 1 ? "" : "s"}</span>
                </p>
              </>
            ) : (
              <p className="text-sm text-f1-grey">Add options to see results.</p>
            )}
          </Card>

          {/* Danger zone */}
          <Card className="border-f1-red/40">
            <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-f1-red">Danger zone</h2>
            <p className="mb-3 text-sm text-f1-grey">Deletes the poll, its options and all votes.</p>
            <form action={deletePollAction}>
              <input type="hidden" name="pollId" value={poll.id} />
              <ConfirmSubmit message={`Delete poll "${poll.question}" and all its votes?`}>
                Delete poll
              </ConfirmSubmit>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
