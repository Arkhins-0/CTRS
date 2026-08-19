import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { circuits, db, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { updateCircuitAction } from "../actions";
import { CircuitFormFields } from "../circuit-form";

export const dynamic = "force-dynamic";

export default async function CircuitEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.RACES_MANAGE);
  const { id } = await params;

  const circuit = await db.query.circuits.findFirst({ where: eq(circuits.id, id) });
  if (!circuit) notFound();

  return (
    <>
      <PageHeader
        title={circuit.name}
        sub={[circuit.locality, circuit.country].filter(Boolean).join(", ")}
        actions={<LinkButton href="/circuits" variant="ghost">Back to circuits</LinkButton>}
      />
      <Card className="max-w-3xl">
        <form action={updateCircuitAction}>
          <CircuitFormFields circuit={circuit} />
        </form>
      </Card>
    </>
  );
}
