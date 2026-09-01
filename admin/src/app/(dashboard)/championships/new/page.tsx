import { PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { createChampionshipAction } from "../actions";
import { ChampionshipFormFields } from "../championship-form";

export const dynamic = "force-dynamic";

export default async function NewChampionshipPage() {
  await requirePermission(PERMISSIONS.RACES_MANAGE);

  return (
    <>
      <PageHeader
        title="New Championship"
        sub="Create the championship — seasons are added on its page afterwards"
        actions={<LinkButton href="/championships" variant="ghost">Back to championships</LinkButton>}
      />

      <Card>
        <form action={createChampionshipAction}>
          <ChampionshipFormFields />
        </form>
      </Card>
    </>
  );
}
