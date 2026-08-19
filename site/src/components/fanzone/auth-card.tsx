import type { ReactNode } from "react";
import { ChamferCard } from "@ctr/ui";

/**
 * Centered chamfered white card on a carbon-fibre band — the premium
 * sign-up / sign-in shell used across the fan zone.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="bg-carbon-fibre">
      <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <ChamferCard corner="tr-lg" className="bg-white p-8">
            <div className="h-1 w-10 bg-f1-red" aria-hidden />
            <h1 className="mt-3 text-2xl font-black uppercase tracking-tight text-carbon">
              {title}
            </h1>
            {subtitle ? <p className="mt-1 text-sm text-f1-grey">{subtitle}</p> : null}
            <div className="mt-6">{children}</div>
          </ChamferCard>
          {footer ? (
            <div className="mt-4 text-center text-sm font-semibold text-warm-grey">{footer}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
