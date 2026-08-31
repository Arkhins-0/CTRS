import { requireMember } from "@/lib/member-auth";
import { PageHeader } from "@/components/ui";
import { DocsBody } from "@/components/docs-body";
import { sectionsFor } from "@/lib/docs-content";

export const metadata = { title: "Help" };

export default async function MemberDocsPage() {
  await requireMember();

  return (
    <>
      <PageHeader title="Help" sub="How to use the CTR console." />
      <DocsBody sections={sectionsFor("member")} />
    </>
  );
}
