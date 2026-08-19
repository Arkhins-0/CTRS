import Link from "next/link";
import { format } from "date-fns";
import { asc } from "drizzle-orm";
import { db, pages, PERMISSIONS } from "@ctr/db";
import { requirePermission } from "@/lib/auth";
import { Card, EmptyState, Field, Input, PageHeader, StatusPill, Table } from "@/components/ui";
import { SubmitButton } from "@/components/ui-client";
import { createPageAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PagesIndex() {
  await requirePermission(PERMISSIONS.PAGES_MANAGE);

  const rows = await db.select().from(pages).orderBy(asc(pages.title));

  return (
    <>
      <PageHeader title="Pages" sub="Static CMS pages rendered from content blocks." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {rows.length ? (
            <Table
              head={
                <>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Updated</th>
                </>
              }
            >
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/pages/${p.id}`} className="font-bold hover:text-f1-red">
                      {p.title}
                    </Link>
                  </td>
                  <td className="text-f1-grey">/{p.slug}</td>
                  <td>
                    <StatusPill status={p.status} />
                  </td>
                  <td className="whitespace-nowrap text-f1-grey">
                    {format(p.updatedAt, "d MMM yyyy HH:mm")}
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState title="No pages yet" hint="Create your first CMS page with the form on the right." />
          )}
        </div>

        <Card className="h-fit">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide">New page</h2>
          <form action={createPageAction} className="space-y-4">
            <Field label="Title">
              <Input name="title" required maxLength={255} placeholder="About CTR Sports" />
            </Field>
            <Field label="Slug" hint="Lowercase letters, numbers and dashes. Left blank = generated from the title.">
              <Input name="slug" pattern="[a-z0-9-]*" maxLength={120} placeholder="about" />
            </Field>
            <SubmitButton>Create draft</SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
