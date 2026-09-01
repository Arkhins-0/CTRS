import type { ReactNode } from "react";

/**
 * Fan-zone tag chip — small rounded rectangle, uppercase, per the f1rd tag
 * primitive (filled brand, tonal, or fixed accent tones).
 */
const styles = {
  /** filled brand — winner chips */
  accent: "bg-brand text-brand-fg",
  /** brand tonal — poll/prediction "kind" badges */
  "accent-outline": "bg-brand/10 text-brand",
  /** neutral tonal */
  outline: "bg-black/10 text-text-5",
  /** dimmer tonal — closed/unsubscribed states */
  faint: "bg-black/5 text-text-3",
  green: "bg-positive text-white",
  amber: "bg-breaking-yellow text-static-11",
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
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-bold uppercase leading-4 ${styles[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
