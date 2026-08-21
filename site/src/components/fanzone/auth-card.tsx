import type { ReactNode } from "react";

/**
 * Centered white rounded card on the warm band — the sign-up / sign-in shell
 * used across the fan zone.
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
    <main className="bg-surface-3">
      <div className="f1-inner flex min-h-[70vh] items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="rounded-md bg-surface-1 p-6 md:p-8">
            <h1 className="display-l font-black uppercase text-text-5">{title}</h1>
            {subtitle ? <p className="body-s mt-2 text-text-3">{subtitle}</p> : null}
            <div className="mt-6">{children}</div>
          </div>
          {footer ? (
            <div className="body-s mt-4 text-center font-semibold text-text-3">{footer}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
