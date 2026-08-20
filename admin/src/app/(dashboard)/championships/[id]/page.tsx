import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Badge } from "@ctr/ui";
import { championships, db, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { Card, Field, Input, LinkButton, PageHeader } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import {
  addChampionshipSeasonAction,
  deleteChampionshipAction,
  deleteChampionshipSeasonAction,
  updateChampionshipAction,
  updateChampionshipSeasonAction,
} from "../actions";
import { ChampionshipFormFields } from "../championship-form";

export const dynamic = "force-dynamic";

const RESERVED_TYPES = ["overall", "team"];
const NAMED_EXTRAS = ["rookie", "gentlemen"];

/** Season sub-types beyond the built-ins and the named checkboxes. */
const freeTextTypes = (types: string[]) =>
  types.filter((t) => !RESERVED_TYPES.includes(t) && !NAMED_EXTRAS.includes(t)).join(", ");

function SeasonPointsFields({
  race,
  sprint,
}: {
  race: string;
  sprint: string;
}) {
  return (
    <>
      <Field
        label="Race points"
        className="min-w-64 flex-1"
        hint="Comma-separated, P1 first — e.g. 25,18,15,12,10,8,6,4,2,1"
      >
        <Input
          name="racePoints"
          required
          defaultValue={race}
          pattern="\s*\d+(\s*,\s*\d+)*\s*"
          placeholder="25,18,15,12,10,8,6,4,2,1"
          className="font-mono"
        />
      </Field>
      <Field
        label="Sprint points"
        className="min-w-64 flex-1"
        hint="Comma-separated — leave empty when the season has no sprints."
      >
        <Input
          name="sprintPoints"
          defaultValue={sprint}
          pattern="\s*(\d+(\s*,\s*\d+)*)?\s*"
          placeholder="8,7,6,5,4,3,2,1"
          className="font-mono"
        />
      </Field>
    </>
  );
}

function StandingsTypesFields({ types }: { types: string[] }) {
  const checkbox = "size-4 accent-f1-red";
  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-f1-grey">
        Standings tables
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-f1-grey">
          <input type="checkbox" checked disabled className={checkbox} /> Overall
        </label>
        <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-f1-grey">
          <input type="checkbox" checked disabled className={checkbox} /> Team
        </label>
        <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-carbon">
          <input
            type="checkbox"
            name="typeRookie"
            defaultChecked={types.includes("rookie")}
            className={checkbox}
          />
          Rookie
        </label>
        <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-carbon">
          <input
            type="checkbox"
            name="typeGentlemen"
            defaultChecked={types.includes("gentlemen")}
            className={checkbox}
          />
          Gentlemen
        </label>
        <Field label="Extra classes" className="min-w-56 flex-1" hint="Comma-separated, e.g. junior, masters">
          <Input name="extraTypes" defaultValue={freeTextTypes(types)} placeholder="junior, masters" />
        </Field>
      </div>
      <p className="mt-1 text-xs text-f1-grey-light">
        Overall and Team are always computed. Sub-tables are filled from driver entries tagged with a
        matching classification.
      </p>
    </div>
  );
}

export default async function ChampionshipEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.RACES_MANAGE);
  const { id } = await params;

  const championship = await db.query.championships.findFirst({
    where: eq(championships.id, id),
    with: {
      logo: { columns: { path: true } },
      seasons: {
        orderBy: (t, { desc }) => [desc(t.year)],
        with: { rounds: { columns: { id: true } } },
      },
    },
  });
  if (!championship) notFound();

  const logoThumb = championship.logo
    ? publicUrl(variantKey(championship.logo.path, "thumb"))
    : null;

  return (
    <>
      <PageHeader
        title={championship.name}
        sub={`${championship.shortName} · /${championship.slug}`}
        actions={
          <>
            <span
              aria-hidden
              className="inline-block size-5 rounded-sm border border-warm-grey"
              style={{ backgroundColor: championship.primaryColor }}
            />
            {championship.isActive ? (
              <Badge tone="green">Active</Badge>
            ) : (
              <Badge tone="grey">Inactive</Badge>
            )}
            <LinkButton href="/championships" variant="ghost">
              Back to championships
            </LinkButton>
          </>
        }
      />

      {/* ── Championship details ─────────────────────────────────────────── */}
      <Card className="max-w-4xl">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wide">Championship details</h2>
        <form action={updateChampionshipAction}>
          <ChampionshipFormFields championship={championship} logoThumbUrl={logoThumb} />
        </form>
      </Card>

      {/* ── Seasons ─────────────────────────────────────────────────────── */}
      <h2 className="mt-6 text-sm font-black uppercase tracking-wide">Seasons</h2>

      {championship.seasons.length ? (
        championship.seasons.map((season) => (
          <Card key={season.id} className="mt-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-lg font-black uppercase">
                {championship.shortName} {season.year}
              </span>
              {season.isCurrent ? <Badge tone="green">Current</Badge> : null}
              <span className="text-xs text-f1-grey">
                {season.rounds.length} round{season.rounds.length === 1 ? "" : "s"} · tables:{" "}
                {season.standingsTypes.join(" · ")}
              </span>
              <span className="ml-auto text-xs text-f1-grey">
                Race {season.pointsSystem.race.join("-")}
                {season.pointsSystem.sprint?.length
                  ? ` · Sprint ${season.pointsSystem.sprint.join("-")}`
                  : ""}
                {season.pointsSystem.fastestLapPoint ? " · FL point" : ""}
              </span>
            </div>

            <div className="flex flex-wrap items-start gap-2">
              <form
                action={updateChampionshipSeasonAction}
                className="grid flex-1 gap-4 sm:grid-cols-2"
              >
                <input type="hidden" name="seasonId" value={season.id} />
                <input type="hidden" name="championshipId" value={championship.id} />
                <div className="flex flex-wrap items-end gap-4">
                  <Field label="Year" className="w-28">
                    <Input
                      name="year"
                      type="number"
                      min={1950}
                      max={2100}
                      required
                      defaultValue={season.year}
                    />
                  </Field>
                  <label className="flex items-center gap-2 pb-2 text-sm font-bold uppercase tracking-wide text-carbon">
                    <input
                      type="checkbox"
                      name="isCurrent"
                      defaultChecked={season.isCurrent}
                      className="size-4 accent-f1-red"
                    />
                    Current season
                  </label>
                </div>
                <div className="hidden sm:block" />
                <SeasonPointsFields
                  race={season.pointsSystem.race.join(",")}
                  sprint={(season.pointsSystem.sprint ?? []).join(",")}
                />
                <StandingsTypesFields types={season.standingsTypes} />
                <div className="sm:col-span-2">
                  <SubmitButton variant="secondary" className="!px-3 !py-2 !text-xs">
                    Save season
                  </SubmitButton>
                </div>
              </form>
              <form action={deleteChampionshipSeasonAction} className="pt-6">
                <input type="hidden" name="seasonId" value={season.id} />
                <input type="hidden" name="championshipId" value={championship.id} />
                <ConfirmSubmit
                  message={`Delete the ${championship.shortName} ${season.year} season? ALL of its rounds, sessions, results, entries and standings will be permanently removed.`}
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
            No seasons yet — rounds, entries and standings all hang off a season, so add one below.
          </p>
        </Card>
      )}

      {/* ── Add season ──────────────────────────────────────────────────── */}
      <Card className="mt-3">
        <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-f1-grey">Add season</h3>
        <form action={addChampionshipSeasonAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="championshipId" value={championship.id} />
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Year" className="w-28">
              <Input name="year" type="number" min={1950} max={2100} required placeholder="2026" />
            </Field>
            <label className="flex items-center gap-2 pb-2 text-sm font-bold uppercase tracking-wide text-carbon">
              <input type="checkbox" name="isCurrent" className="size-4 accent-f1-red" />
              Current season
            </label>
          </div>
          <div className="hidden sm:block" />
          <SeasonPointsFields race="25,18,15,12,10,8,6,4,2,1" sprint="8,7,6,5,4,3,2,1" />
          <StandingsTypesFields types={[]} />
          <div className="sm:col-span-2">
            <SubmitButton variant="secondary">Add season</SubmitButton>
          </div>
        </form>
      </Card>

      {/* ── Danger zone ─────────────────────────────────────────────────── */}
      <Card className="mt-6 border-f1-red/40">
        <h2 className="text-sm font-black uppercase tracking-wide text-f1-red">Danger zone</h2>
        <p className="mt-1 text-sm text-f1-grey">
          Deleting this championship removes every season, round, session, result, entry and
          standings table under it. This cannot be undone.
        </p>
        <form action={deleteChampionshipAction} className="mt-3">
          <input type="hidden" name="id" value={championship.id} />
          <ConfirmSubmit
            message={`Delete ${championship.name}? ALL of its seasons, rounds, results and standings will be permanently removed.`}
          >
            Delete championship
          </ConfirmSubmit>
        </form>
      </Card>
    </>
  );
}
