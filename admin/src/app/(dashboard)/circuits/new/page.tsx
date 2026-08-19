import { PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { createCircuitAction } from "../actions";
import { CircuitFormFields } from "../circuit-form";

export const dynamic = "force-dynamic";

export default async function NewCircuitPage() {
  await requirePermission(PERMISSIONS.RACES_MANAGE);

  return (
    <>
      <PageHeader
        title="New Circuit"
        sub="Add a circuit to the library"
        actions={<LinkButton href="/circuits" variant="ghost">Back to circuits</LinkButton>}
      />
      <Card className="max-w-3xl">
        <form action={createCircuitAction}>
          <CircuitFormFields />
        </form>
      </Card>
    </>
  );
}
