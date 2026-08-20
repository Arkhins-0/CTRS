import Link from "next/link";

/**
 * Dev-only helper box: no real email delivery exists in this project, so we
 * surface the newsletter confirmation link on-screen instead.
 */
export function DevNote({ confirmHref }: { confirmHref: string }) {
  return (
    <div className="border border-accent bg-accent/10 p-3 text-sm text-white">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Dev note</p>
      <p className="mt-1">
        Email sending isn&apos;t configured —{" "}
        <Link href={confirmHref} className="font-bold text-accent underline hover:no-underline">
          confirm here
        </Link>
        .
      </p>
    </div>
  );
}
