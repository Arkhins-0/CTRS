import { circuits, formatLapTime } from "@ctr/db";
import { MediaPickerInput } from "@/components/media/media-picker";
import { Field, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";

type Circuit = typeof circuits.$inferSelect;

/** Shared field set for /circuits/new and /circuits/[id]. */
export function CircuitFormFields({
  circuit,
  mapThumbUrl,
  photoThumbUrl,
}: {
  circuit?: Circuit;
  mapThumbUrl?: string | null;
  photoThumbUrl?: string | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {circuit ? <input type="hidden" name="id" value={circuit.id} /> : null}

      <Field label="Name" className="sm:col-span-2" hint={circuit ? undefined : "The slug is generated from this."}>
        <Input name="name" required maxLength={200} defaultValue={circuit?.name ?? ""} placeholder="Circuit de Monaco" />
      </Field>
      {circuit ? (
        <Field label="Slug" className="sm:col-span-2">
          <Input name="slug" maxLength={120} defaultValue={circuit.slug} pattern="[a-z0-9-]+" />
        </Field>
      ) : null}
      <Field label="Official name" className="sm:col-span-2">
        <Input name="officialName" maxLength={255} defaultValue={circuit?.officialName ?? ""} />
      </Field>
      <Field label="Locality">
        <Input name="locality" maxLength={120} defaultValue={circuit?.locality ?? ""} placeholder="Monte Carlo" />
      </Field>
      <Field label="Country">
        <Input name="country" required maxLength={120} defaultValue={circuit?.country ?? ""} placeholder="Monaco" />
      </Field>
      <Field label="Country code" hint="2-letter ISO code, e.g. MC">
        <Input name="countryCode" maxLength={2} defaultValue={circuit?.countryCode ?? ""} className="uppercase" />
      </Field>
      <Field label="Length (km)">
        <Input name="lengthKm" type="number" step="0.001" min={0} defaultValue={circuit?.lengthKm ?? ""} placeholder="3.337" />
      </Field>
      <Field label="Race laps">
        <Input name="raceLaps" type="number" min={1} max={500} defaultValue={circuit?.raceLaps ?? ""} placeholder="78" />
      </Field>
      <Field label="Lap record" hint='e.g. "1:19.813" — stored as milliseconds'>
        <Input
          name="lapRecordTime"
          maxLength={20}
          defaultValue={circuit?.lapRecordTimeMs != null ? formatLapTime(circuit.lapRecordTimeMs) : ""}
          placeholder="1:19.813"
        />
      </Field>
      <Field label="Lap record driver">
        <Input name="lapRecordDriver" maxLength={120} defaultValue={circuit?.lapRecordDriver ?? ""} />
      </Field>
      <Field label="Lap record year">
        <Input name="lapRecordYear" type="number" min={1950} max={2100} defaultValue={circuit?.lapRecordYear ?? ""} />
      </Field>
      <Field label="First GP year">
        <Input name="firstGpYear" type="number" min={1950} max={2100} defaultValue={circuit?.firstGpYear ?? ""} />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <Textarea name="description" defaultValue={circuit?.description ?? ""} rows={5} />
      </Field>
      <Field label="Track map" hint="Circuit layout graphic.">
        <MediaPickerInput
          name="mapMediaId"
          initialId={circuit?.mapMediaId}
          initialUrl={mapThumbUrl}
        />
      </Field>
      <Field label="Photo" hint="Venue photo for the circuit page.">
        <MediaPickerInput
          name="photoMediaId"
          initialId={circuit?.photoMediaId}
          initialUrl={photoThumbUrl}
        />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton>{circuit ? "Save circuit" : "Create circuit"}</SubmitButton>
      </div>
    </div>
  );
}
