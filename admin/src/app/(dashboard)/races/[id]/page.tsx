import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { Badge } from "@ctr/ui";
import { circuits, db, raceCategories, rounds, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { MediaPickerInput } from "@/components/media/media-picker";
import { Card, Field, Input, LinkButton, PageHeader, Select, StatusPill } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { loadSeasonTabs } from "@/components/racing/season-tabs";
import {
  addSessionAction,
  deleteGpAction,
  deleteSessionAction,
  generateWeekendAction,
  updateGpAction,
  updateSessionAction,
} from "../actions";

export const dynamic = "force-dynamic";

// "race2" is retired — a second race is type "race" with sequence 2.
const SESSION_ORDER: readonly string[] = [
  "fp1",
  "fp2",
  "fp3",
  "sprint_qualifying",
  "sprint",
  "qualifying",
  "race",
];

const SESSION_LABELS: Record<string, string> = {
  fp1: "Practice 1",
  fp2: "Practice 2",
  fp3: "Practice 3",
  sprint_qualifying: "Sprint Qualifying",
  sprint: "Sprint",
  qualifying: "Qualifying",
  race: "Race",
};

/** "Race 2" for (race, 2); the stored label still wins for display. */
const sessionTypeLabel = (type: string, sequence: number) =>
  type === "race" ? `Race ${sequence}` : (SESSION_LABELS[type] ?? type);

/** (type, sequence) pairs generated for every active category on an INCRC weekend. */
const INCRC_SLOTS: readonly { type: string; sequence: number }[] = [
  { type: "fp1", sequence: 1 },
  { type: "qualifying", sequence: 1 },
  { type: "race", sequence: 1 },
  { type: "race", sequence: 2 },
];

const toLocalInput = (d: Date | null) => (d ? format(d, "yyyy-MM-dd'T'HH:mm") : "");

export default async function RaceEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission(PERMISSIONS.RACES_MANAGE);
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const round = await db.query.rounds.findFirst({
    where: eq(rounds.id, id),
    with: {
      championshipSeason: { with: { championship: { columns: { shortName: true } } } },
      circuit: true,
      heroImage: { columns: { path: true } },
      sessions: {
        with: { category: { columns: { id: true, shortName: true, color: true, sort: true } } },
      },
    },
  });
  if (!round) notFound();
  const seasonLabel = `${round.championshipSeason.championship.shortName} ${round.championshipSeason.year}`;

  const [seasons, allCircuits, allCategories] = await Promise.all([
    loadSeasonTabs(),
    db.select().from(circuits).orderBy(asc(circuits.name)),
    db
      .select()
      .from(raceCategories)
      .orderBy(asc(raceCategories.sort), asc(raceCategories.shortName)),
  ]);

  const activeCategories = allCategories.filter((c) => c.isActive);

  // weekend-wide sessions first, then per category (by sort), then type order, then sequence
  const sessions = [...round.sessions].sort((a, b) => {
    const catA = a.category ? a.category.sort : -1;
    const catB = b.category ? b.category.sort : -1;
    if (catA !== catB) return catA - catB;
    const nameA = a.category?.shortName ?? "";
    const nameB = b.category?.shortName ?? "";
    if (nameA !== nameB) return nameA.localeCompare(nameB);
    if (a.type !== b.type) return SESSION_ORDER.indexOf(a.type) - SESSION_ORDER.indexOf(b.type);
    return a.sequence - b.sequence;
  });

  // "Generate standard weekend" is useful while any (active category, type, sequence) slot is missing
  const existingSlots = new Set(
    round.sessions.map((s) => `${s.categoryId ?? ""}|${s.type}|${s.sequence}`),
  );
  const canGenerate =
    activeCategories.length > 0 &&
    activeCategories.some((c) =>
      INCRC_SLOTS.some((slot) => !existingSlots.has(`${c.id}|${slot.type}|${slot.sequence}`)),
    );

  const heroThumb = round.heroImage ? publicUrl(variantKey(round.heroImage.path, "thumb")) : null;

  /** Options for a session's category select — active categories, plus the
   *  session's current (possibly inactive) category so the value isn't lost. */
  const categoryOptions = (currentId?: string | null) =>
    allCategories.filter((c) => c.isActive || c.id === currentId);

  return (
    <>
      <PageHeader
        title={round.name}
        sub={`Round ${round.round} · ${seasonLabel} · ${round.circuit.name}`}
        actions={
          <>
            {round.hasSprint ? <Badge tone="red">Sprint</Badge> : null}
            <StatusPill status={round.status} />
            <LinkButton href={`/races?season=${round.championshipSeasonId}`} variant="ghost">
              Back to calendar
            </LinkButton>
          </>
        }
      />

      {sp.error === "duplicate-session" ? (
        <div className="chamfer-tr mb-4 border border-f1-red bg-surface px-4 py-3 text-sm font-bold text-f1-red">
          That session already exists — each weekend allows one session per (category, type,
          sequence) combination. Use a higher sequence for a second race of the same type.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ── Weekend details ─────────────────────────────────────────── */}
        <Card>
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Weekend details</h2>
          <form action={updateGpAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={round.id} />
            <Field label="Season">
              <Select name="championshipSeasonId" defaultValue={round.championshipSeasonId}>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Round">
              <Input name="round" type="number" min={1} max={30} required defaultValue={round.round} />
            </Field>
            <Field label="Name" className="sm:col-span-2">
              <Input name="name" required maxLength={200} defaultValue={round.name} />
            </Field>
            <Field label="Official name" className="sm:col-span-2">
              <Input name="officialName" maxLength={255} defaultValue={round.officialName ?? ""} />
            </Field>
            <Field label="Circuit" className="sm:col-span-2">
              <Select name="circuitId" defaultValue={round.circuitId}>
                {allCircuits.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.country}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start date">
              <Input name="startDate" type="date" defaultValue={round.startDate ?? ""} />
            </Field>
            <Field label="End date">
              <Input name="endDate" type="date" defaultValue={round.endDate ?? ""} />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={round.status}>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm font-bold uppercase tracking-wide text-fg">
              <input
                type="checkbox"
                name="hasSprint"
                defaultChecked={round.hasSprint}
                className="size-4 accent-f1-red"
              />
              Sprint weekend
            </label>
            <Field label="Hero image" className="sm:col-span-2" hint="Shown on the weekend's public pages.">
              <MediaPickerInput defaultFolder="race-weekends" name="heroMediaId" initialId={round.heroMediaId} initialUrl={heroThumb} />
            </Field>
            <div className="sm:col-span-2">
              <SubmitButton>Save weekend</SubmitButton>
            </div>
          </form>
        </Card>

        {/* ── Sessions ────────────────────────────────────────────────── */}
        <Card>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black uppercase tracking-wide">Sessions</h2>
            {canGenerate ? (
              <form action={generateWeekendAction}>
                <input type="hidden" name="roundId" value={round.id} />
                <SubmitButton
                  variant="secondary"
                  className="!px-3 !py-1.5 !text-xs"
                  title="Practice + Qualifying (Fri), Race 1 (Sat) and Race 2 (Sun) for every active category, IST slots by category order"
                >
                  Generate standard weekend
                </SubmitButton>
              </form>
            ) : null}
          </div>

          {sessions.length ? (
            <ul className="space-y-3">
              {sessions.map((s) => (
                <li key={s.id} className="border border-line bg-page p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block size-3 rounded-sm border border-line"
                      style={{ backgroundColor: s.category?.color ?? "#67676d" }}
                    />
                    <span className="text-sm font-black uppercase">
                      {s.label ?? sessionTypeLabel(s.type, s.sequence)}
                    </span>
                    <span className="text-xs text-fg-muted">
                      {s.category ? s.category.shortName : "Weekend-wide"} ·{" "}
                      {sessionTypeLabel(s.type, s.sequence)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <form action={updateSessionAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="sessionId" value={s.id} />
                      <input type="hidden" name="roundId" value={round.id} />
                      <Field label="Category" className="w-44">
                        <Select name="categoryId" defaultValue={s.categoryId ?? ""}>
                          <option value="">Weekend-wide</option>
                          {categoryOptions(s.categoryId).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.shortName}
                              {c.isActive ? "" : " (inactive)"}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Seq" className="w-16" hint="Race 2 = 2">
                        <Input
                          name="sequence"
                          type="number"
                          min={1}
                          max={9}
                          required
                          defaultValue={s.sequence}
                        />
                      </Field>
                      <Field label="Label" className="w-44">
                        <Input
                          name="label"
                          maxLength={120}
                          defaultValue={s.label ?? ""}
                          placeholder="ISC — Race 1"
                        />
                      </Field>
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
                      <input type="hidden" name="roundId" value={round.id} />
                      <ConfirmSubmit
                        message={`Delete ${s.label ?? sessionTypeLabel(s.type, s.sequence)}? Its results will be deleted too.`}
                      >
                        Delete
                      </ConfirmSubmit>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">
              No sessions yet — generate the standard weekend (per-category Practice, Qualifying,
              Race 1 and Race 2) or add sessions manually below.
            </p>
          )}

          <form
            action={addSessionAction}
            className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4"
          >
            <input type="hidden" name="roundId" value={round.id} />
            <Field label="Add session" className="w-44">
              <Select name="type" required defaultValue="race">
                {SESSION_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {SESSION_LABELS[t] ?? t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Seq" className="w-16" hint="Race 2 = 2">
              <Input name="sequence" type="number" min={1} max={9} defaultValue={1} />
            </Field>
            <Field label="Category" className="w-44">
              <Select name="categoryId" defaultValue="">
                <option value="">Weekend-wide</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Label" className="w-44">
              <Input name="label" maxLength={120} placeholder="ISC — Race 1" />
            </Field>
            <Field label="Starts at" className="w-52">
              <Input name="startsAt" type="datetime-local" />
            </Field>
            <SubmitButton variant="secondary" className="!px-3 !py-2 !text-xs">
              Add
            </SubmitButton>
          </form>
        </Card>
      </div>

      {/* ── Danger zone ─────────────────────────────────────────────────── */}
      <Card className="mt-5 border-f1-red/40">
        <h2 className="text-sm font-black uppercase tracking-wide text-f1-red">Danger zone</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Deleting this round also deletes all of its sessions and results. This cannot be undone.
        </p>
        <form action={deleteGpAction} className="mt-3">
          <input type="hidden" name="id" value={round.id} />
          <ConfirmSubmit message={`Delete ${round.name} (${seasonLabel})? All sessions and results will be permanently removed.`}>
            Delete round
          </ConfirmSubmit>
        </form>
      </Card>
    </>
  );
}
