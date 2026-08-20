import { asc } from "drizzle-orm";
import { circuits, db, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, Field, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { loadSeasonTabs, pickSeason } from "@/components/racing/season-tabs";
import { createGpAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewRacePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  await requirePermission(PERMISSIONS.RACES_MANAGE);
  const sp = await searchParams;

  const [seasons, allCircuits] = await Promise.all([
    loadSeasonTabs(),
    db.select().from(circuits).orderBy(asc(circuits.name)),
  ]);

  const defaultSeason = pickSeason(seasons, sp.season);

  return (
    <>
      <PageHeader
        title="New Race Weekend"
        sub="Add a round to a championship season's calendar"
        actions={
          <LinkButton
            href={`/races${defaultSeason ? `?season=${defaultSeason.id}` : ""}`}
            variant="ghost"
          >
            Back to calendar
          </LinkButton>
        }
      />

      <Card className="max-w-3xl">
        <form action={createGpAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Season">
            <Select name="championshipSeasonId" defaultValue={defaultSeason?.id ?? ""} required>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Round">
            <Input name="round" type="number" min={1} max={30} required placeholder="1" />
          </Field>
          <Field label="Name" className="sm:col-span-2" hint="e.g. Coimbatore — the slug is generated from this.">
            <Input name="name" required maxLength={200} placeholder="Coimbatore" />
          </Field>
          <Field label="Official name" className="sm:col-span-2" hint="Full sponsor title (optional).">
            <Input name="officialName" maxLength={255} placeholder="CTR INCRC 2026 Round 1 — Kari Motor Speedway" />
          </Field>
          <Field label="Circuit" className="sm:col-span-2">
            <Select name="circuitId" required defaultValue="">
              <option value="" disabled>
                Select a circuit…
              </option>
              {allCircuits.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.country}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Start date">
            <Input name="startDate" type="date" />
          </Field>
          <Field label="End date">
            <Input name="endDate" type="date" />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="scheduled">
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm font-bold uppercase tracking-wide text-carbon">
            <input type="checkbox" name="hasSprint" className="size-4 accent-f1-red" />
            Sprint weekend
          </label>
          <div className="sm:col-span-2">
            <SubmitButton>Create race weekend</SubmitButton>
          </div>
        </form>
      </Card>
    </>
  );
}
