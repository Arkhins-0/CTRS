import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/** Shared shell for the signed-out pages (login, reset, confirm). */
export function AuthCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="safe-t safe-b flex min-h-dvh items-center justify-center bg-carbon-fibre px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="chamfer-tr-lg border-t-4 border-accent bg-surface p-6 sm:p-8">
          <Link href="/login">
            <Image
              src="/ctr-logo.webp"
              alt="CTR Sports"
              width={132}
              height={74}
              priority
              className="mb-5 h-auto w-28"
            />
          </Link>
          <h1 className="text-2xl font-black uppercase tracking-tight text-fg">{title}</h1>
          {children}
        </div>
        {footer ? <div className="mt-4 text-center text-xs text-fg-faint">{footer}</div> : null}
      </div>
    </main>
  );
}
