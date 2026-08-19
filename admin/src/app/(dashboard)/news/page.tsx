import Link from "next/link";
import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { format } from "date-fns";
import { articleCategories, articles, db, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import {
  Button,
  EmptyState,
  Input,
  LinkButton,
  PageHeader,
  Select,
  StatusPill,
  Table,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUSES = ["draft", "scheduled", "published", "archived"] as const;

export default async function NewsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.NEWS_MANAGE);
  const { status = "", category = "", q = "", error } = await searchParams;

  const conditions: SQL[] = [];
  if ((STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(articles.status, status as (typeof STATUSES)[number]));
  }
  const categoryId = Number.parseInt(category, 10);
  if (Number.isInteger(categoryId) && categoryId > 0) {
    conditions.push(eq(articles.categoryId, categoryId));
  }
  const query = q.trim();
  if (query) conditions.push(ilike(articles.title, `%${query}%`));

  const [rows, categories] = await Promise.all([
    db.query.articles.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      with: { category: true, author: true },
      orderBy: [desc(articles.updatedAt)],
      limit: 100,
    }),
    db
      .select()
      .from(articleCategories)
      .orderBy(articleCategories.sort, articleCategories.name),
  ]);

  return (
    <>
      <PageHeader
        title="News"
        sub="Articles, categories and tags"
        actions={
          <>
            <LinkButton variant="ghost" href="/news/categories">
              Categories
            </LinkButton>
            <LinkButton variant="ghost" href="/news/tags">
              Tags
            </LinkButton>
            <LinkButton href="/news/new">New article</LinkButton>
          </>
        }
      />

      {error ? (
        <p className="mb-4 border border-f1-red bg-white p-3 text-sm font-bold text-f1-red">
          Something went wrong ({error}). Please try again.
        </p>
      ) : null}

      <form method="GET" action="/news" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select name="category" defaultValue={category}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-64">
          <Input type="search" name="q" defaultValue={query} placeholder="Search titles…" />
        </div>
        <Button variant="ghost">Filter</Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="No articles found"
          hint={query || status || category ? "Try clearing the filters." : "Create your first article."}
        />
      ) : (
        <Table
          head={
            <>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Author</th>
              <th>Published</th>
              <th>Updated</th>
            </>
          }
        >
          {rows.map((a) => (
            <tr key={a.id}>
              <td>
                <Link href={`/news/${a.id}`} className="font-bold text-carbon hover:text-f1-red">
                  {a.isBreaking ? (
                    <span className="mr-1.5 inline-block bg-f1-red px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                      Breaking
                    </span>
                  ) : null}
                  {a.title}
                </Link>
              </td>
              <td className="text-f1-grey">{a.category?.name ?? "—"}</td>
              <td>
                <StatusPill status={a.status} />
              </td>
              <td className="text-f1-grey">
                {a.authorNameOverride ?? a.author?.displayName ?? "—"}
              </td>
              <td className="whitespace-nowrap text-f1-grey">
                {a.publishedAt ? format(a.publishedAt, "d MMM yyyy HH:mm") : "—"}
              </td>
              <td className="whitespace-nowrap text-f1-grey">
                {format(a.updatedAt, "d MMM yyyy HH:mm")}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
