import Link from "next/link";

/**
 * Dev-only helper box: no real email delivery exists in this project, so we
 * surface the newsletter confirmation link on-screen instead.
 */
export function DevNote({ confirmHref }: { confirmHref: string }) {
  return (
    <div className="border border-amber-500/60 bg-amber-500/10 p-3 text-sm text-carbon">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Dev note</p>
      <p className="mt-1">
        Email sending isn&apos;t configured —{" "}
        <Link href={confirmHref} className="font-bold text-f1-red underline hover:no-underline">
          confirm here
        </Link>
        .
      </p>
    </div>
  );
}
