import type { ReactNode } from "react";

/**
 * Dark-theme chip for the fan zone (same shape as @ctr/ui Badge, but with
 * CTR dark-token tones so no class overriding is needed).
 */
const styles = {
  /** filled accent — winner chips */
  accent: "bg-accent text-accent-fg",
  /** accent outline — poll/prediction "kind" badges */
  "accent-outline": "border border-accent text-accent",
  /** neutral outline on dark surfaces */
  outline: "border border-line text-fg-muted",
  /** dimmer outline — closed/unsubscribed states */
  faint: "border border-line text-fg-faint",
  green: "bg-emerald-600 text-white",
  amber: "bg-amber-500 text-carbon",
} as const;

export function Chip({
  tone = "outline",
  className = "",
  children,
}: {
  tone?: keyof typeof styles;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`chamfer-tr inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${styles[tone]} ${className}`}
      style={{ ["--chamfer" as string]: "6px" }}
    >
      {children}
    </span>
  );
}
