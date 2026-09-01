import type { championships } from "@ctr/db";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { MediaPickerInput } from "@/components/media/media-picker";

type Championship = typeof championships.$inferSelect;

export const CHAMPIONSHIP_TYPES = [
  { value: "mixed", label: "Mixed" },
  { value: "touring", label: "Touring" },
  { value: "single_seater", label: "Single-seater" },
  { value: "karting", label: "Karting" },
  { value: "other", label: "Other" },
] as const;

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-line pb-2 text-xs font-black uppercase tracking-wide text-fg-muted">
      {children}
    </h3>
  );
}

/**
 * Shared field set for /championships/new and /championships/[id].
 *
 * Two columns on wide screens — identity fields left, branding (colours +
 * a big logo preview) right — so the form fills the page instead of leaving
 * the whole right half of the screen empty.
 */
export function ChampionshipFormFields({
  championship,
  logoThumbUrl,
}: {
  championship?: Championship;
  logoThumbUrl?: string | null;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:gap-10">
      {championship ? <input type="hidden" name="id" value={championship.id} /> : null}

      {/* ── Identity ──────────────────────────────────────────────────── */}
      <div className="grid content-start gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <ColumnHeading>Identity</ColumnHeading>
        </div>
        <Field label="Name" className="sm:col-span-2">
          <Input
            name="name"
            required
            maxLength={255}
            defaultValue={championship?.name ?? ""}
            placeholder="CTR–JK Tyre FMSCI Indian National Car Racing Championship"
          />
        </Field>
        <Field
          label="Short name"
          hint={championship ? "Used on tabs and chips." : "Used on tabs and chips — the slug is generated from this."}
        >
          <Input
            name="shortName"
            required
            maxLength={60}
            defaultValue={championship?.shortName ?? ""}
            placeholder="INCRC"
          />
        </Field>
        <Field label="Type">
          <Select name="type" defaultValue={championship?.type ?? "mixed"}>
            {CHAMPIONSHIP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        {championship ? (
          <Field label="Slug" className="sm:col-span-2">
            <Input name="slug" maxLength={120} defaultValue={championship.slug} pattern="[a-z0-9-]+" />
          </Field>
        ) : null}
        <Field label="Description" className="sm:col-span-2">
          <Textarea name="description" rows={5} defaultValue={championship?.description ?? ""} />
        </Field>
        <Field label="Sort" hint="Lower numbers appear first.">
          <Input
            name="sort"
            type="number"
            min={0}
            max={999}
            defaultValue={championship?.sort ?? 0}
            className="w-24"
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold uppercase tracking-wide text-fg">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={championship?.isActive ?? true}
            className="size-4 accent-f1-red"
          />
          Active championship
        </label>
      </div>

      {/* ── Branding ──────────────────────────────────────────────────── */}
      <div className="grid content-start gap-4">
        <ColumnHeading>Branding</ColumnHeading>
        <div className="flex flex-wrap gap-4">
          <Field label="Primary colour" hint="Championship accent.">
            <input
              type="color"
              name="primaryColor"
              defaultValue={championship?.primaryColor ?? "#F7D619"}
              className="h-9 w-14 cursor-pointer border border-line bg-surface p-0.5"
            />
          </Field>
          <Field label="Secondary colour">
            <input
              type="color"
              name="secondaryColor"
              defaultValue={championship?.secondaryColor ?? "#15151E"}
              className="h-9 w-14 cursor-pointer border border-line bg-surface p-0.5"
            />
          </Field>
        </div>
        <Field label="Logo" hint="Shown on tabs, headers and the public site.">
          <MediaPickerInput
            defaultFolder="championships"
            name="logoMediaId"
            initialId={championship?.logoMediaId}
            initialUrl={logoThumbUrl}
          />
        </Field>
      </div>

      <div className="xl:col-span-2">
        <SubmitButton>{championship ? "Save championship" : "Create championship"}</SubmitButton>
      </div>
    </div>
  );
}
