import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Badge } from "@ctr/ui";
import { db, raceCategories, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { variantKey } from "@/components/media/variants";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { ConfirmSubmit } from "@/components/ui-client";
import { deleteCategoryAction, updateCategoryAction } from "../actions";
import { CategoryFormFields } from "../category-form";

export const dynamic = "force-dynamic";

export default async function CategoryEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.RACES_MANAGE);
  const { id } = await params;

  const category = await db.query.raceCategories.findFirst({
    where: eq(raceCategories.id, id),
    with: { image: { columns: { path: true } } },
  });
  if (!category) notFound();

  const imageThumb = category.image ? publicUrl(variantKey(category.image.path, "thumb")) : null;

  return (
    <>
      <PageHeader
        title={category.name}
        sub={`${category.shortName} · /${category.slug}`}
        actions={
          <>
            <span
              aria-hidden
              className="inline-block size-5 rounded-sm border border-line"
              style={{ backgroundColor: category.color }}
            />
            {category.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="grey">Inactive</Badge>}
            <LinkButton href="/categories" variant="ghost">
              Back to categories
            </LinkButton>
          </>
        }
      />

      <Card className="max-w-3xl">
        <form action={updateCategoryAction}>
          <CategoryFormFields category={category} imageThumbUrl={imageThumb} />
        </form>
      </Card>

      <Card className="mt-5 max-w-3xl border-f1-red/40">
        <h2 className="text-sm font-black uppercase tracking-wide text-f1-red">Danger zone</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Deleting this category also deletes ALL of its sessions (with their results) and every
          driver season entry assigned to it. This cannot be undone.
        </p>
        <form action={deleteCategoryAction} className="mt-3">
          <input type="hidden" name="id" value={category.id} />
          <ConfirmSubmit
            message={`Delete ${category.name}? All of its sessions, results and driver entries will be permanently removed.`}
          >
            Delete category
          </ConfirmSubmit>
        </form>
      </Card>
    </>
  );
}
