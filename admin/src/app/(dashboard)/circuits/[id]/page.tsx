import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { circuits, db, media, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { updateCircuitAction } from "../actions";
import { CircuitFormFields } from "../circuit-form";

export const dynamic = "force-dynamic";

export default async function CircuitEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.RACES_MANAGE);
  const { id } = await params;

  const circuit = await db.query.circuits.findFirst({ where: eq(circuits.id, id) });
  if (!circuit) notFound();

  const mediaIds = [circuit.mapMediaId, circuit.photoMediaId].filter((v): v is string => v !== null);
  const mediaRows = mediaIds.length
    ? await db
        .select({ id: media.id, path: media.path })
        .from(media)
        .where(inArray(media.id, mediaIds))
    : [];
  const thumbById = new Map(mediaRows.map((m) => [m.id, publicUrl(variantKey(m.path, "thumb"))]));

  return (
    <>
      <PageHeader
        title={circuit.name}
        sub={[circuit.locality, circuit.country].filter(Boolean).join(", ")}
        actions={<LinkButton href="/circuits" variant="ghost">Back to circuits</LinkButton>}
      />
      <Card className="max-w-3xl">
        <form action={updateCircuitAction}>
          <CircuitFormFields
            circuit={circuit}
            mapThumbUrl={circuit.mapMediaId ? thumbById.get(circuit.mapMediaId) : null}
            photoThumbUrl={circuit.photoMediaId ? thumbById.get(circuit.photoMediaId) : null}
          />
        </form>
      </Card>
    </>
  );
}
