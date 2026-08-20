import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { TeamColorBar } from "@ctr/ui";
import { db, teams, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { MediaPickerInput } from "@/components/media/media-picker";
import { Card, Field, Input, LinkButton, PageHeader, Select, Textarea } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { loadSeasonTabs } from "@/components/racing/season-tabs";
import {
  createTeamEntryAction,
  deleteTeamAction,
  saveCarAction,
  updateTeamAction,
  updateTeamEntryAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function TeamEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.TEAMS_MANAGE);
  const { id } = await params;

  const [team, allSeasons] = await Promise.all([
    db.query.teams.findFirst({
      where: eq(teams.id, id),
      with: {
        logo: { columns: { path: true } },
        seasonEntries: {
          with: {
            championshipSeason: { with: { championship: { columns: { shortName: true } } } },
            car: { with: { image: { columns: { path: true } } } },
            logo: { columns: { path: true } },
            carImage: { columns: { path: true } },
            driverEntries: { with: { driver: { columns: { firstName: true, lastName: true, code: true } } } },
          },
        },
      },
    }),
    loadSeasonTabs(),
  ]);
  if (!team) notFound();

  const seasonEntries = [...team.seasonEntries].sort(
    (a, b) =>
      b.championshipSeason.year - a.championshipSeason.year ||
      a.championshipSeason.championship.shortName.localeCompare(
        b.championshipSeason.championship.shortName,
      ),
  );
  const usedSeasonIds = new Set(seasonEntries.map((e) => e.championshipSeasonId));
  const availableSeasons = allSeasons.filter((s) => !usedSeasonIds.has(s.id));

  return (
    <>
      <PageHeader
        title={team.name}
        sub={team.fullName ?? "Canonical team, season entries & cars"}
        actions={<LinkButton href="/teams" variant="ghost">Back to teams</LinkButton>}
      />

      {/* ── Canonical team ─────────────────────────────────────────────── */}
      <Card className="max-w-4xl">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Team details</h2>
        <form action={updateTeamAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={team.id} />
          <Field label="Name">
            <Input name="name" required maxLength={120} defaultValue={team.name} />
          </Field>
          <Field label="Slug">
            <Input name="slug" maxLength={120} defaultValue={team.slug} pattern="[a-z0-9-]+" />
          </Field>
          <Field label="Full name">
            <Input name="fullName" maxLength={200} defaultValue={team.fullName ?? ""} />
          </Field>
          <Field label="Base">
            <Input name="base" maxLength={200} defaultValue={team.base ?? ""} />
          </Field>
          <Field label="Country code" hint="2-letter ISO code">
            <Input name="countryCode" maxLength={2} defaultValue={team.countryCode ?? ""} className="uppercase" />
          </Field>
          <Field label="First entry year">
            <Input name="firstEntryYear" type="number" min={1900} max={2100} defaultValue={team.firstEntryYear ?? ""} />
          </Field>
          <Field label="World championships">
            <Input name="worldChampionships" type="number" min={0} max={50} defaultValue={team.worldChampionships} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea name="description" rows={5} defaultValue={team.description ?? ""} />
          </Field>
          <Field label="Team logo" className="sm:col-span-2" hint="Canonical logo used across the site.">
            <MediaPickerInput
              name="logoMediaId"
              initialId={team.logoMediaId}
              initialUrl={team.logo ? publicUrl(variantKey(team.logo.path, "thumb")) : null}
            />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton>Save team</SubmitButton>
          </div>
        </form>
      </Card>

      {/* ── Season entries ─────────────────────────────────────────────── */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wide">Season entries</h2>
      </div>

      {seasonEntries.map((entry) => {
        const specs = (entry.car?.specs ?? {}) as Record<string, string | undefined>;
        return (
          <Card key={entry.id} className="mt-3">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <TeamColorBar color={entry.primaryColor} className="!min-h-6" />
              <span className="text-lg font-black uppercase">
                {entry.championshipSeason.championship.shortName} {entry.championshipSeason.year}
              </span>
              <span className="font-bold">{entry.displayName}</span>
              {entry.driverEntries.length ? (
                <span className="ml-auto text-xs text-f1-grey">
                  Drivers:{" "}
                  {entry.driverEntries
                    .map((d) => `${d.driver.code} (#${d.carNumber})`)
                    .join(" · ")}
                </span>
              ) : (
                <span className="ml-auto text-xs text-f1-grey-light">No drivers assigned yet</span>
              )}
            </div>

            <form action={updateTeamEntryAction} className="grid gap-4 sm:grid-cols-3">
              <input type="hidden" name="entryId" value={entry.id} />
              <Field label="Display name">
                <Input name="displayName" required maxLength={200} defaultValue={entry.displayName} />
              </Field>
              <Field label="Short name">
                <Input name="shortName" required maxLength={60} defaultValue={entry.shortName} />
              </Field>
              <div className="flex gap-4">
                <Field label="Primary">
                  <input
                    type="color"
                    name="primaryColor"
                    defaultValue={entry.primaryColor}
                    className="h-9 w-14 cursor-pointer border border-warm-grey bg-white p-0.5"
                  />
                </Field>
                <Field label="Secondary">
                  <input
                    type="color"
                    name="secondaryColor"
                    defaultValue={entry.secondaryColor ?? "#15151e"}
                    className="h-9 w-14 cursor-pointer border border-warm-grey bg-white p-0.5"
                  />
                </Field>
              </div>
              <Field label="Team principal">
                <Input name="teamPrincipal" maxLength={120} defaultValue={entry.teamPrincipal ?? ""} />
              </Field>
              <Field label="Power unit supplier">
                <Input name="powerUnitSupplier" maxLength={120} defaultValue={entry.powerUnitSupplier ?? ""} />
              </Field>
              <Field label="Season logo" hint="Overrides the canonical logo for this season.">
                <MediaPickerInput
                  name="logoMediaId"
                  initialId={entry.logoMediaId}
                  initialUrl={entry.logo ? publicUrl(variantKey(entry.logo.path, "thumb")) : null}
                />
              </Field>
              <Field label="Car image" hint="Season car shot for team/car pages.">
                <MediaPickerInput
                  name="carImageMediaId"
                  initialId={entry.carImageMediaId}
                  initialUrl={entry.carImage ? publicUrl(variantKey(entry.carImage.path, "thumb")) : null}
                />
              </Field>
              <div className="flex items-end">
                <SubmitButton variant="secondary" className="!px-3 !py-2 !text-xs">
                  Save entry
                </SubmitButton>
              </div>
            </form>

            {/* Car editor */}
            <div className="mt-4 border-t border-warm-grey pt-4">
              <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-f1-grey">
                Car {entry.car ? `— ${entry.car.modelName}` : "(none yet)"}
              </h3>
              <form action={saveCarAction} className="grid gap-4 sm:grid-cols-3">
                <input type="hidden" name="entryId" value={entry.id} />
                <Field label="Model name">
                  <Input name="modelName" required maxLength={60} defaultValue={entry.car?.modelName ?? ""} placeholder="MCL39" />
                </Field>
                <Field label="Chassis">
                  <Input name="chassis" maxLength={120} defaultValue={entry.car?.chassis ?? ""} />
                </Field>
                <Field label="Power unit">
                  <Input name="powerUnit" maxLength={120} defaultValue={entry.car?.powerUnit ?? ""} />
                </Field>
                <Field label="Weight">
                  <Input name="weight" maxLength={60} defaultValue={specs.weight ?? ""} placeholder="800 kg" />
                </Field>
                <Field label="Engine">
                  <Input name="engine" maxLength={120} defaultValue={specs.engine ?? ""} placeholder="1.6L V6 turbo hybrid" />
                </Field>
                <Field label="ERS">
                  <Input name="ers" maxLength={120} defaultValue={specs.ers ?? ""} />
                </Field>
                <Field label="Gearbox">
                  <Input name="gearbox" maxLength={120} defaultValue={specs.gearbox ?? ""} placeholder="8-speed semi-automatic" />
                </Field>
                <Field label="Fuel">
                  <Input name="fuel" maxLength={120} defaultValue={specs.fuel ?? ""} />
                </Field>
                <Field label="Note">
                  <Input name="note" maxLength={500} defaultValue={specs.note ?? ""} />
                </Field>
                <Field label="Car image (media)" className="sm:col-span-3" hint="Studio/side-on car render.">
                  <MediaPickerInput
                    name="imageMediaId"
                    initialId={entry.car?.imageMediaId}
                    initialUrl={
                      entry.car?.image ? publicUrl(variantKey(entry.car.image.path, "thumb")) : null
                    }
                  />
                </Field>
                <div className="sm:col-span-3">
                  <SubmitButton variant="secondary" className="!px-3 !py-2 !text-xs">
                    Save car
                  </SubmitButton>
                </div>
              </form>
            </div>
          </Card>
        );
      })}

      {availableSeasons.length ? (
        <Card className="mt-3">
          <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-f1-grey">Add season entry</h3>
          <form action={createTeamEntryAction} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="teamId" value={team.id} />
            <Field label="Season">
              <Select name="championshipSeasonId" required defaultValue={availableSeasons[0].id}>
                {availableSeasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Display name">
              <Input name="displayName" required maxLength={200} defaultValue={team.fullName ?? team.name} />
            </Field>
            <Field label="Short name">
              <Input name="shortName" required maxLength={60} defaultValue={team.name} />
            </Field>
            <div className="flex gap-4">
              <Field label="Primary">
                <input
                  type="color"
                  name="primaryColor"
                  defaultValue="#67676d"
                  className="h-9 w-14 cursor-pointer border border-warm-grey bg-white p-0.5"
                />
              </Field>
              <Field label="Secondary">
                <input
                  type="color"
                  name="secondaryColor"
                  defaultValue="#15151e"
                  className="h-9 w-14 cursor-pointer border border-warm-grey bg-white p-0.5"
                />
              </Field>
            </div>
            <Field label="Team principal">
              <Input name="teamPrincipal" maxLength={120} />
            </Field>
            <Field label="Power unit supplier">
              <Input name="powerUnitSupplier" maxLength={120} />
            </Field>
            <div className="sm:col-span-3">
              <SubmitButton variant="secondary">Add season entry</SubmitButton>
            </div>
          </form>
        </Card>
      ) : null}

      {/* ── Danger zone ────────────────────────────────────────────────── */}
      <Card className="mt-6 border-f1-red/40">
        <h2 className="text-sm font-black uppercase tracking-wide text-f1-red">Danger zone</h2>
        <p className="mt-1 text-sm text-f1-grey">
          Deleting this team removes every season entry, car, driver assignment and result linked to
          it — across all seasons. This cannot be undone.
        </p>
        <form action={deleteTeamAction} className="mt-3">
          <input type="hidden" name="id" value={team.id} />
          <ConfirmSubmit
            message={`Delete ${team.name}? ALL of its season entries, cars, driver assignments and results will be permanently removed.`}
          >
            Delete team
          </ConfirmSubmit>
        </form>
      </Card>
    </>
  );
}
