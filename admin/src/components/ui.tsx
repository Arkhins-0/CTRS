import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/* Server-safe UI primitives shared by every CMS section. */

const btnBase =
  "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed chamfer-tr";

const btnStyles: Record<string, string> = {
  primary: "bg-f1-red text-white hover:bg-f1-red-dark",
  secondary: "bg-carbon text-white hover:bg-carbon-700",
  ghost: "border border-warm-grey bg-white text-carbon hover:border-carbon",
  danger: "bg-white border border-f1-red text-f1-red hover:bg-f1-red hover:text-white",
};

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof btnStyles }) {
  return <button className={`${btnBase} ${btnStyles[variant]} ${className}`} {...rest} />;
}

export function LinkButton({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: keyof typeof btnStyles;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${btnBase} ${btnStyles[variant]} ${className}`}>
      {children}
    </Link>
  );
}

const fieldBase =
  "w-full border border-warm-grey bg-white px-3 py-2 text-sm text-carbon outline-none focus:border-f1-red disabled:bg-off-white";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldBase} min-h-24 ${className}`} {...rest} />;
}

export function Select({ className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldBase} ${className}`} {...rest} />;
}

export function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-f1-grey">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-f1-grey-light">{hint}</span> : null}
    </label>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`chamfer-tr border border-warm-grey bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  actions,
  sub,
}: {
  title: string;
  actions?: ReactNode;
  sub?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="border-l-4 border-f1-red pl-3 text-2xl font-black uppercase tracking-tight">
          {title}
        </h1>
        {sub ? <p className="mt-1 pl-4 text-sm text-f1-grey">{sub}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="chamfer-tr overflow-x-auto border border-warm-grey bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-carbon bg-carbon text-left text-xs font-bold uppercase tracking-wide text-white [&>th]:px-4 [&>th]:py-3">
            {head}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-warm-grey [&>tr:hover]:bg-off-white [&>tr>td]:px-4 [&>tr>td]:py-3">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="chamfer-tr border border-dashed border-f1-grey-light bg-white p-10 text-center">
      <p className="font-bold uppercase text-f1-grey">{title}</p>
      {hint ? <p className="mt-1 text-sm text-f1-grey-light">{hint}</p> : null}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    published: "bg-emerald-600 text-white",
    open: "bg-emerald-600 text-white",
    completed: "bg-emerald-600 text-white",
    confirmed: "bg-emerald-600 text-white",
    draft: "bg-warm-grey text-carbon",
    scheduled: "bg-amber-500 text-carbon",
    pending: "bg-amber-500 text-carbon",
    live: "bg-f1-red text-white",
    archived: "bg-carbon-600 text-white",
    closed: "bg-carbon-600 text-white",
    cancelled: "bg-carbon-600 text-white",
    unsubscribed: "bg-carbon-600 text-white",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tones[status] ?? "bg-warm-grey text-carbon"}`}
    >
      {status}
    </span>
  );
}
