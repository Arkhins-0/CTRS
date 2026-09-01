import Link from "next/link";
import { Children, cloneElement, isValidElement } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/*
 * Server-safe UI primitives shared by every CMS section.
 *
 * Dark-first: surfaces step page -> surface -> panel and depth comes from the
 * hairline `line` border, never a shadow. CTR yellow (`accent`) is reserved for
 * the primary write action — anything sitting on it must use `accent-fg`.
 *
 * Controls are min-h-11 (44px) so they stay reliable touch targets on a phone.
 */

const btnBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const btnStyles: Record<string, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-dark",
  secondary: "bg-panel text-fg hover:bg-line",
  ghost: "border border-line bg-surface text-fg hover:border-fg-faint",
  danger: "border border-f1-red bg-surface text-f1-red hover:bg-f1-red hover:text-white",
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
  "w-full min-h-11 border border-line bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-accent disabled:bg-panel disabled:text-fg-faint";

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
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-fg-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-fg-faint">{hint}</span> : null}
    </label>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-md border border-line bg-surface p-4 sm:p-5 ${className}`}>
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
      <div className="min-w-0">
        <h1 className="border-l-4 border-accent pl-3 text-xl font-black uppercase tracking-tight text-fg sm:text-2xl">
          {title}
        </h1>
        {sub ? <p className="mt-1 pl-4 text-sm text-fg-muted">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/**
 * Flattens a header cell to plain text so it can be reused as a mobile label.
 * Headers are usually a bare string, but some wrap an icon or span.
 */
function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) {
    return nodeText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

// "data-label" is declared so cloneElement accepts it — React types do not
// allow arbitrary data-* attributes through a typed props object.
type CellProps = { children?: ReactNode; colSpan?: number; "data-label"?: string };

/**
 * Data table that becomes a list of cards below `lg`.
 *
 * A wide table in a horizontally scrolling box pushes the last columns —
 * usually status and the row actions — off-screen behind a swipe, which is
 * normally what the page is for. Rather than hand-writing a card layout on
 * every screen, each cell is tagged with its column heading here and CSS
 * restacks the rows (see `.rtable` in globals.css). Callers pass the same
 * `head` and `<tr>`/`<td>` markup as before and get both layouts.
 */
export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  // `head` arrives as a fragment of <th>; unwrap it to read the labels in order.
  const headNodes = isValidElement(head)
    ? ((head.props as { children?: ReactNode }).children ?? head)
    : head;
  const labels = Children.toArray(headNodes)
    .filter(isValidElement)
    .map((th) => nodeText((th.props as { children?: ReactNode }).children).trim());

  const rows = Children.map(children, (row) => {
    if (!isValidElement(row) || row.type !== "tr") return row;
    const rowProps = row.props as { children?: ReactNode };

    let index = 0;
    const cells = Children.map(rowProps.children, (cell) => {
      if (!isValidElement(cell) || cell.type !== "td") return cell;
      const props = cell.props as CellProps;
      const label = labels[index];
      index += 1;
      // A spanning cell (e.g. an inline "no results" row) has no single column.
      if (props.colSpan) return cell;
      return label ? cloneElement(cell as ReactElement<CellProps>, { "data-label": label }) : cell;
    });

    return cloneElement(row as ReactElement<{ children?: ReactNode }>, {}, cells);
  });

  return (
    <div className="chamfer-tr border border-line bg-surface max-lg:border-0 max-lg:bg-transparent lg:overflow-x-auto">
      <table className="rtable w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-panel text-left text-xs font-bold uppercase tracking-wide text-fg [&>th]:whitespace-nowrap [&>th]:px-4 [&>th]:py-3">
            {head}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line [&>tr:last-child]:border-0 [&>tr:hover]:bg-panel [&>tr>td]:px-4 [&>tr>td]:py-3">
          {rows}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="chamfer-tr border border-dashed border-line bg-surface p-10 text-center">
      <p className="font-bold uppercase text-fg-muted">{title}</p>
      {hint ? <p className="mt-1 text-sm text-fg-faint">{hint}</p> : null}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  // Tones are picked to clear AA against the LIGHT surfaces they sit on:
  // soft tint background, dark ink of the same hue.
  const tones: Record<string, string> = {
    published: "bg-emerald-500/10 text-emerald-800 ring-emerald-600/30",
    open: "bg-emerald-500/10 text-emerald-800 ring-emerald-600/30",
    completed: "bg-emerald-500/10 text-emerald-800 ring-emerald-600/30",
    confirmed: "bg-emerald-500/10 text-emerald-800 ring-emerald-600/30",
    draft: "bg-panel text-fg-muted ring-line",
    scheduled: "bg-amber-500/15 text-amber-800 ring-amber-600/40",
    pending: "bg-amber-500/15 text-amber-800 ring-amber-600/40",
    live: "bg-f1-red/10 text-f1-red ring-f1-red/30",
    archived: "bg-panel text-fg-faint ring-line",
    closed: "bg-panel text-fg-faint ring-line",
    cancelled: "bg-panel text-fg-faint ring-line",
    unsubscribed: "bg-panel text-fg-faint ring-line",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${tones[status] ?? "bg-panel text-fg-muted ring-line"}`}
    >
      {status}
    </span>
  );
}
