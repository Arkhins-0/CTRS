import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { Badge } from "@ctr/ui";
import { circuits, db, grandsPrix, seasons, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, Field, Input, LinkButton, PageHeader, Select, StatusPill } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import {
  addSessionAction,
  deleteGpAction,
  deleteSessionAction,
  generateWeekendAction,
  updateGpAction,
  updateSessionAction,
} from "../actions";

export const dynamic = "force-dynamic";

const SESSION_ORDER = ["fp1", "fp2", "fp3", "sprint_qualifying", "sprint", "qualifying", "race"] as const;

const SESSION_LABELS: Record<string, string> = {
  fp1: "Practice 1",
  fp2: "Practice 2",
  fp3: "Practice 3",
  sprint_qualifying: "Sprint Qualifying",
  sprint: "Sprint",
  qualifying: "Qualifying",
  race: "Race",
};

const toLocalInput = (d: Date | null) => (d ? format(d, "yyyy-MM-dd'T'HH:mm") : "");

export default async function RaceEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.RACES_MANAGE);
  const { id } = await params;

  const gp = await db.query.grandsPrix.findFirst({
    where: eq(grandsPrix.id, id),
    with: { circuit: true, sessions: true },
  });
  if (!gp) notFound();

  const [allSeasons, allCircuits] = await Promise.all([
    db.select().from(seasons).orderBy(desc(seasons.year)),
    db.select().from(circuits).orderBy(asc(circuits.name)),
  ]);

  const sessions = [...gp.sessions].sort(
    (a, b) => SESSION_ORDER.indexOf(a.type) - SESSION_ORDER.indexOf(b.type),
  );
  const existingTypes = new Set(sessions.map((s) => s.type));
  const missingTypes = SESSION_ORDER.filter((t) => !existingTypes.has(t));
  const standardTypes: readonly string[] = gp.hasSprint
    ? ["fp1", "sprint_qualifying", "sprint", "qualifying", "race"]
    : ["fp1", "fp2", "fp3", "qualifying", "race"];
  const missingStandard = standardTypes.filter((t) => !existingTypes.has(t as (typeof SESSION_ORDER)[number]));

  return (
    <>
      <PageHeader
        title={gp.name}
        sub={`Round ${gp.round} · ${gp.seasonYear} · ${gp.circuit.name}`}
        actions={
          <>
            {gp.hasSprint ? <Badge tone="red">Sprint</Badge> : null}
            <StatusPill status={gp.status} />
            <LinkButton href={`/races?year=${gp.seasonYear}`} variant="ghost">
              Back to calendar
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ── Weekend details ─────────────────────────────────────────── */}
        <Card>
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Weekend details</h2>
          <form action={updateGpAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={gp.id} />
            <Field label="Season">
              <Select name="seasonYear" defaultValue={gp.seasonYear}>
                {allSeasons.map((s) => (
                  <option key={s.year} value={s.year}>
                    {s.year}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Round">
              <Input name="round" type="number" min={1} max={30} required defaultValue={gp.round} />
            </Field>
            <Field label="Name" className="sm:col-span-2">
              <Input name="name" required maxLength={200} defaultValue={gp.name} />
            </Field>
            <Field label="Official name" className="sm:col-span-2">
              <Input name="officialName" maxLength={255} defaultValue={gp.officialName ?? ""} />
            </Field>
            <Field label="Circuit" className="sm:col-span-2">
              <Select name="circuitId" defaultValue={gp.circuitId}>
                {allCircuits.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.country}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start date">
              <Input name="startDate" type="date" defaultValue={gp.startDate ?? ""} />
            </Field>
            <Field label="End date">
              <Input name="endDate" type="date" defaultValue={gp.endDate ?? ""} />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={gp.status}>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm font-bold uppercase tracking-wide text-carbon">
              <input
                type="checkbox"
                name="hasSprint"
                defaultChecked={gp.hasSprint}
                className="size-4 accent-f1-red"
              />
              Sprint weekend
            </label>
            <div className="sm:col-span-2">
              <SubmitButton>Save weekend</SubmitButton>
            </div>
          </form>
        </Card>

        {/* ── Sessions ────────────────────────────────────────────────── */}
        <Card>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black uppercase tracking-wide">Sessions</h2>
            {missingStandard.length ? (
              <form action={generateWeekendAction}>
                <input type="hidden" name="gpId" value={gp.id} />
                <SubmitButton variant="secondary" className="!px-3 !py-1.5 !text-xs">
                  Generate standard weekend
                </SubmitButton>
              </form>
            ) : null}
          </div>

          {sessions.length ? (
            <ul className="space-y-3">
              {sessions.map((s) => (
                <li key={s.id} className="border border-warm-grey bg-off-white p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <span className="w-36 pb-2 text-sm font-black uppercase">
                      {SESSION_LABELS[s.type] ?? s.type}
                    </span>
                    <form action={updateSessionAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="sessionId" value={s.id} />
                      <input type="hidden" name="gpId" value={gp.id} />
                      <Field label="Starts at" className="w-52">
                        <Input
                          name="startsAt"
                          type="datetime-local"
                          defaultValue={toLocalInput(s.startsAt)}
                        />
                      </Field>
                      <Field label="Status" className="w-36">
                        <Select name="status" defaultValue={s.status}>
                          <option value="scheduled">Scheduled</option>
                          <option value="live">Live</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </Select>
                      </Field>
                      <SubmitButton variant="secondary" className="!px-3 !py-2 !text-xs">
                        Save
                      </SubmitButton>
                    </form>
                    <form action={deleteSessionAction}>
                      <input type="hidden" name="sessionId" value={s.id} />
                      <input type="hidden" name="gpId" value={gp.id} />
                      <ConfirmSubmit message={`Delete ${SESSION_LABELS[s.type] ?? s.type}? Its results will be deleted too.`}>
                        Delete
                      </ConfirmSubmit>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-f1-grey">
              No sessions yet — generate the standard weekend or add sessions manually.
            </p>
          )}

          {missingTypes.length ? (
            <form action={addSessionAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-warm-grey pt-4">
              <input type="hidden" name="gpId" value={gp.id} />
              <Field label="Add session" className="w-44">
                <Select name="type" required defaultValue={missingTypes[0]}>
                  {missingTypes.map((t) => (
                    <option key={t} value={t}>
                      {SESSION_LABELS[t] ?? t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Starts at" className="w-52">
                <Input name="startsAt" type="datetime-local" />
              </Field>
              <SubmitButton variant="secondary" className="!px-3 !py-2 !text-xs">
                Add
              </SubmitButton>
            </form>
          ) : null}
        </Card>
      </div>

      {/* ── Danger zone ─────────────────────────────────────────────────── */}
      <Card className="mt-5 border-f1-red/40">
        <h2 className="text-sm font-black uppercase tracking-wide text-f1-red">Danger zone</h2>
        <p className="mt-1 text-sm text-f1-grey">
          Deleting this Grand Prix also deletes all of its sessions and results. This cannot be undone.
        </p>
        <form action={deleteGpAction} className="mt-3">
          <input type="hidden" name="id" value={gp.id} />
          <ConfirmSubmit message={`Delete ${gp.name} (${gp.seasonYear})? All sessions and results will be permanently removed.`}>
            Delete Grand Prix
          </ConfirmSubmit>
        </form>
      </Card>
    </>
  );
}
