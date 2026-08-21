import Link from "next/link";

/**
 * Dev-only helper box: no real email delivery exists in this project, so we
 * surface the newsletter confirmation link on-screen instead.
 */
export function DevNote({ confirmHref }: { confirmHref: string }) {
  return (
    <div className="rounded-md border border-surface-4 bg-surface-3 p-4">
      <p className="text-[11px] font-bold uppercase leading-4 text-brand">Dev note</p>
      <p className="body-xs mt-1.5 text-text-4">
        Email sending isn&apos;t configured —{" "}
        <Link href={confirmHref} className="font-bold text-brand underline hover:no-underline">
          confirm here
        </Link>
        .
      </p>
    </div>
  );
}
