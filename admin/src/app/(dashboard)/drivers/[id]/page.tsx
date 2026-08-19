import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Badge, CountryFlag } from "@ctr/ui";
import { db, drivers, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, Field, Input, LinkButton, PageHeader, Select, Textarea } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import {
  addDriverEntryAction,
  deleteDriverEntryAction,
  updateDriverAction,
  updateDriverEntryAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function DriverEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.DRIVERS_MANAGE);
  const { id } = await params;

  const [driver, allTeamEntries] = await Promise.all([
    db.query.drivers.findFirst({
      where: eq(drivers.id, id),
      with: {
        seasonEntries: {
          orderBy: (t, { desc }) => [desc(t.seasonYear)],
          with: {
            teamSeasonEntry: {
              columns: { id: true, displayName: true, shortName: true, primaryColor: true, seasonYear: true },
            },
          },
        },
      },
    }),
    db.query.teamSeasonEntries.findMany({
      orderBy: (t, { desc }) => [desc(t.seasonYear)],
      columns: { id: true, displayName: true, seasonYear: true },
    }),
  ]);
  if (!driver) notFound();

  return (
    <>
      <PageHeader
        title={`${driver.firstName} ${driver.lastName}`}
        sub={`${driver.code} · ${driver.seasonEntries.length} season entr${driver.seasonEntries.length === 1 ? "y" : "ies"}`}
        actions={
          <>
            <CountryFlag code={driver.countryCode} className="text-2xl" />
            {driver.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="grey">Inactive</Badge>}
            <LinkButton href="/drivers" variant="ghost">
              Back to drivers
            </LinkButton>
          </>
        }
      />

      {/* ── Driver profile ─────────────────────────────────────────────── */}
      <Card className="max-w-4xl">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Driver profile</h2>
        <form action={updateDriverAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={driver.id} />
          <Field label="First name">
            <Input name="firstName" required maxLength={120} defaultValue={driver.firstName} />
          </Field>
          <Field label="Last name">
            <Input name="lastName" required maxLength={120} defaultValue={driver.lastName} />
          </Field>
          <Field label="Code" hint="3-letter code">
            <Input
              name="code"
              required
              maxLength={3}
              minLength={3}
              pattern="[A-Za-z]{3}"
              className="uppercase"
              defaultValue={driver.code}
            />
          </Field>
          <Field label="Slug">
            <Input name="slug" maxLength={120} defaultValue={driver.slug} pattern="[a-z0-9-]+" />
          </Field>
          <Field label="Country code" hint="2-letter ISO code">
            <Input name="countryCode" maxLength={2} className="uppercase" defaultValue={driver.countryCode ?? ""} />
          </Field>
          <Field label="Date of birth">
            <Input name="dateOfBirth" type="date" defaultValue={driver.dateOfBirth ?? ""} />
          </Field>
          <Field label="Place of birth" className="sm:col-span-2">
            <Input name="placeOfBirth" maxLength={200} defaultValue={driver.placeOfBirth ?? ""} />
          </Field>
          <Field label="Biography" className="sm:col-span-2">
            <Textarea name="biography" rows={6} defaultValue={driver.biography ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-carbon">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={driver.isActive}
              className="size-4 accent-f1-red"
            />
            Active driver
          </label>
          <div className="sm:col-span-2">
            <SubmitButton>Save driver</SubmitButton>
          </div>
        </form>
      </Card>

      {/* ── Season entries ─────────────────────────────────────────────── */}
      <h2 className="mt-6 text-sm font-black uppercase tracking-wide">Season entries</h2>

      {driver.seasonEntries.length ? (
        driver.seasonEntries.map((entry) => (
          <Card key={entry.id} className="mt-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-5 w-1 rounded-sm"
                style={{ backgroundColor: entry.teamSeasonEntry.primaryColor }}
              />
              <span className="text-lg font-black uppercase">{entry.seasonYear}</span>
              <span className="font-bold">{entry.teamSeasonEntry.displayName}</span>
              <span className="text-xs text-f1-grey">
                #{entry.carNumber} · {entry.role}
                {entry.fromRound || entry.toRound
                  ? ` · rounds ${entry.fromRound ?? "start"} → ${entry.toRound ?? "end"}`
                  : ""}
              </span>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <form action={updateDriverEntryAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="entryId" value={entry.id} />
                <input type="hidden" name="driverId" value={driver.id} />
                <Field label="Car #" className="w-20">
                  <Input name="carNumber" type="number" min={0} max={999} required defaultValue={entry.carNumber} />
                </Field>
                <Field label="Role" className="w-32">
                  <Select name="role" defaultValue={entry.role}>
                    <option value="primary">Primary</option>
                    <option value="reserve">Reserve</option>
                  </Select>
                </Field>
                <Field label="From round" className="w-28" hint="blank = start">
                  <Input name="fromRound" type="number" min={1} max={30} defaultValue={entry.fromRound ?? ""} />
                </Field>
                <Field label="To round" className="w-28" hint="blank = end">
                  <Input name="toRound" type="number" min={1} max={30} defaultValue={entry.toRound ?? ""} />
                </Field>
                <div className="pb-5">
                  <SubmitButton variant="secondary" className="!px-3 !py-2 !text-xs">
                    Save
                  </SubmitButton>
                </div>
              </form>
              <form action={deleteDriverEntryAction} className="pb-5">
                <input type="hidden" name="entryId" value={entry.id} />
                <input type="hidden" name="driverId" value={driver.id} />
                <ConfirmSubmit
                  message={`Remove the ${entry.seasonYear} entry with ${entry.teamSeasonEntry.shortName}? Any results linked to it will be deleted too.`}
                >
                  Delete
                </ConfirmSubmit>
              </form>
            </div>
          </Card>
        ))
      ) : (
        <Card className="mt-3">
          <p className="text-sm text-f1-grey">
            No season entries yet — the driver won&rsquo;t appear in results grids or standings until
            one is added.
          </p>
        </Card>
      )}

      {/* ── Add entry ──────────────────────────────────────────────────── */}
      <Card className="mt-3">
        <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-f1-grey">Add season entry</h3>
        {allTeamEntries.length ? (
          <form action={addDriverEntryAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="driverId" value={driver.id} />
            <Field label="Team season entry" className="w-72" hint="The season is taken from the selected entry.">
              <Select name="teamSeasonEntryId" required defaultValue="">
                <option value="" disabled>
                  Select a team entry…
                </option>
                {allTeamEntries.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.seasonYear} — {e.displayName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Car #" className="w-20">
              <Input name="carNumber" type="number" min={0} max={999} required placeholder="1" />
            </Field>
            <Field label="Role" className="w-32">
              <Select name="role" defaultValue="primary">
                <option value="primary">Primary</option>
                <option value="reserve">Reserve</option>
              </Select>
            </Field>
            <Field label="From round" className="w-28" hint="optional">
              <Input name="fromRound" type="number" min={1} max={30} />
            </Field>
            <Field label="To round" className="w-28" hint="optional">
              <Input name="toRound" type="number" min={1} max={30} />
            </Field>
            <div className="pb-5">
              <SubmitButton variant="secondary">Add entry</SubmitButton>
            </div>
          </form>
        ) : (
          <p className="text-sm text-f1-grey">
            No team season entries exist yet — create one under Teams &amp; Cars first.
          </p>
        )}
      </Card>
    </>
  );
}
