import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { DocsBody } from "@/components/docs-body";
import { sectionsFor } from "@/lib/docs-content";

export const metadata = { title: "User guide" };

export default async function StaffDocsPage() {
  // Any signed-in admin may read the guide — it documents the console, not data.
  await requireAdmin();

  return (
    <>
      <PageHeader title="User guide" sub="How the console works, for CTR staff." />
      <DocsBody sections={sectionsFor("staff")} />
    </>
  );
}
