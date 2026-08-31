import { count, eq } from "drizzle-orm";
import { articleCategories, articles, db, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, EmptyState, Input, LinkButton, PageHeader, Table } from "@/components/ui";
import { ConfirmSubmit, SubmitButton } from "@/components/ui-client";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "./actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid: "Invalid input — a name is required.",
  "slug-taken": "That slug is already in use.",
  "has-articles": "Category not deleted — articles still use it. Reassign them first.",
  "not-found": "Category not found.",
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePermission(PERMISSIONS.NEWS_MANAGE);
  const { error } = await searchParams;

  const [categories, counts] = await Promise.all([
    db.select().from(articleCategories).orderBy(articleCategories.sort, articleCategories.name),
    db
      .select({ categoryId: articles.categoryId, n: count() })
      .from(articles)
      .groupBy(articles.categoryId),
  ]);
  const countByCategory = new Map(counts.map((c) => [c.categoryId, c.n]));

  return (
    <>
      <PageHeader
        title="Article categories"
        sub="Categories group articles on the public site"
        actions={<LinkButton variant="ghost" href="/news">← Back to news</LinkButton>}
      />

      {error ? (
        <p className="mb-4 border border-f1-red bg-surface p-3 text-sm font-bold text-f1-red">
          {ERRORS[error] ?? "Something went wrong."}
        </p>
      ) : null}

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide">Add category</h2>
        <form action={createCategoryAction} className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Input name="name" placeholder="Name" required maxLength={120} />
          </div>
          <div className="w-56">
            <Input name="slug" placeholder="Slug (auto from name)" maxLength={120} />
          </div>
          <div className="w-24">
            <Input name="sort" type="number" placeholder="Sort" defaultValue={0} />
          </div>
          <SubmitButton>Add</SubmitButton>
        </form>
      </Card>

      {categories.length === 0 ? (
        <EmptyState title="No categories yet" hint="Add the first category above." />
      ) : (
        <Table
          head={
            <>
              <th>Name</th>
              <th>Slug</th>
              <th>Sort</th>
              <th>Articles</th>
              <th className="w-24" />
            </>
          }
        >
          {categories.map((c) => {
            const inUse = countByCategory.get(c.id) ?? 0;
            return (
              <tr key={c.id}>
                <td colSpan={4}>
                  <form
                    action={updateCategoryAction}
                    className="flex flex-wrap items-center gap-3"
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <div className="w-56">
                      <Input name="name" defaultValue={c.name} required maxLength={120} />
                    </div>
                    <div className="w-56">
                      <Input name="slug" defaultValue={c.slug} maxLength={120} className="font-mono" />
                    </div>
                    <div className="w-20">
                      <Input name="sort" type="number" defaultValue={c.sort} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wide text-fg-muted">
                      {inUse} article{inUse === 1 ? "" : "s"}
                    </span>
                    <SubmitButton variant="secondary" className="!px-3 !py-1.5 !text-xs">
                      Save
                    </SubmitButton>
                  </form>
                </td>
                <td className="text-right">
                  <form action={deleteCategoryAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmSubmit
                      message={
                        inUse > 0
                          ? `“${c.name}” still has ${inUse} article(s) — deletion will be refused.`
                          : `Delete category “${c.name}”?`
                      }
                    >
                      Delete
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
