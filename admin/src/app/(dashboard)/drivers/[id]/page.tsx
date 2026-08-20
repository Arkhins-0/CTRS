import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Badge, CountryFlag } from "@ctr/ui";
import { db, drivers, raceCategories, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { MediaPickerInput } from "@/components/media/media-picker";
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

  const [driver, teamEntryRows, allCategories] = await Promise.all([
    db.query.drivers.findFirst({
      where: eq(drivers.id, id),
      with: {
        headshot: { columns: { path: true } },
        seasonEntries: {
          with: {
            teamSeasonEntry: {
              columns: { id: true, displayName: true, shortName: true, primaryColor: true },
            },
            championshipSeason: {
              columns: { year: true },
              with: { championship: { columns: { shortName: true } } },
            },
            category: { columns: { id: true, shortName: true, color: true } },
          },
        },
      },
    }),
    db.query.teamSeasonEntries.findMany({
      columns: { id: true, displayName: true },
      with: {
        championshipSeason: {
          columns: { year: true },
          with: { championship: { columns: { shortName: true } } },
        },
      },
    }),
    db
      .select()
      .from(raceCategories)
      .orderBy(asc(raceCategories.sort), asc(raceCategories.shortName)),
  ]);
  if (!driver) notFound();

  const seasonLabel = (e: {
    championshipSeason: { year: number; championship: { shortName: string } };
  }) => `${e.championshipSeason.championship.shortName} ${e.championshipSeason.year}`;

  const seasonEntries = [...driver.seasonEntries].sort(
    (a, b) => b.championshipSeason.year - a.championshipSeason.year,
  );
  const allTeamEntries = [...teamEntryRows].sort(
    (a, b) =>
      b.championshipSeason.year - a.championshipSeason.year ||
      a.displayName.localeCompare(b.displayName),
  );

  const activeCategories = allCategories.filter((c) => c.isActive);
  /** Active categories, plus an entry's (possibly inactive) current one. */
  const categoryOptions = (currentId?: string | null) =>
    allCategories.filter((c) => c.isActive || c.id === currentId);

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
          <Field label="Headshot" className="sm:col-span-2">
            <MediaPickerInput
              name="headshotMediaId"
              initialId={driver.headshotMediaId}
              initialUrl={driver.headshot ? publicUrl(variantKey(driver.headshot.path, "thumb")) : null}
            />
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

      {/* classification suggestions shared by every entry form */}
      <datalist id="classification-suggestions">
        <option value="rookie" />
        <option value="gentlemen" />
      </datalist>

      {seasonEntries.length ? (
        seasonEntries.map((entry) => (
          <Card key={entry.id} className="mt-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-5 w-1 rounded-sm"
                style={{ backgroundColor: entry.teamSeasonEntry.primaryColor }}
              />
              <span className="text-lg font-black uppercase">{seasonLabel(entry)}</span>
              <span className="font-bold">{entry.teamSeasonEntry.displayName}</span>
              {entry.category ? (
                <span className="inline-flex items-center gap-1.5 border border-warm-grey bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-carbon">
                  <span
                    aria-hidden
                    className="inline-block size-2.5 rounded-sm"
                    style={{ backgroundColor: entry.category.color }}
                  />
                  {entry.category.shortName}
                </span>
              ) : (
                <Badge tone="amber">No category</Badge>
              )}
              {entry.classification ? (
                <span className="inline-flex items-center border border-carbon bg-carbon px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  {entry.classification}
                </span>
              ) : null}
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
                <Field label="Category" className="w-40">
                  <Select name="categoryId" required defaultValue={entry.categoryId ?? ""}>
                    <option value="" disabled>
                      Select a category…
                    </option>
                    {categoryOptions(entry.categoryId).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.shortName}
                        {c.isActive ? "" : " (inactive)"}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Classification" className="w-36" hint="blank = none">
                  <Input
                    name="classification"
                    maxLength={30}
                    list="classification-suggestions"
                    defaultValue={entry.classification ?? ""}
                    placeholder="rookie"
                  />
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
                  message={`Remove the ${seasonLabel(entry)} entry with ${entry.teamSeasonEntry.shortName}? Any results linked to it will be deleted too.`}
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
                    {seasonLabel(e)} — {e.displayName}
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
            <Field label="Category" className="w-40" hint="The class this entry races in.">
              <Select name="categoryId" required defaultValue="">
                <option value="" disabled>
                  Select a category…
                </option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Classification" className="w-36" hint="optional — rookie / gentlemen">
              <Input
                name="classification"
                maxLength={30}
                list="classification-suggestions"
                placeholder="rookie"
              />
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
