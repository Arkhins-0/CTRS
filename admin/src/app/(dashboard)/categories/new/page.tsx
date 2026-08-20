import { PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { createCategoryAction } from "../actions";
import { CategoryFormFields } from "../category-form";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  await requirePermission(PERMISSIONS.RACES_MANAGE);

  return (
    <>
      <PageHeader
        title="New Category"
        sub="Add a racing class to the championship"
        actions={<LinkButton href="/categories" variant="ghost">Back to categories</LinkButton>}
      />
      <Card className="max-w-3xl">
        <form action={createCategoryAction}>
          <CategoryFormFields />
        </form>
      </Card>
    </>
  );
}
