import { LinkButton } from "@/components/ui";

export const metadata = { title: "Access denied" };

export default function DeniedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-black italic text-f1-red">403</p>
      <h1 className="mt-2 text-xl font-black uppercase">You don&apos;t have access to that section</h1>
      <p className="mt-1 max-w-md text-sm text-fg-muted">
        Your admin roles don&apos;t include the required permission. Ask a Super Admin if you think
        this is a mistake.
      </p>
      <LinkButton href="/" className="mt-6" variant="secondary">
        Back to dashboard
      </LinkButton>
    </div>
  );
}
