import type { ReactNode } from "react";

const styles: Record<string, string> = {
  red: "bg-f1-red text-white",
  dark: "bg-carbon text-white",
  grey: "bg-warm-grey text-carbon",
  green: "bg-emerald-600 text-white",
  amber: "bg-amber-500 text-carbon",
  outline: "border border-f1-grey-light text-f1-grey",
};

export function Badge({
  tone = "grey",
  className = "",
  children,
}: {
  tone?: keyof typeof styles;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase tracking-wide chamfer-tr ${styles[tone]} ${className}`}
      style={{ ["--chamfer" as string]: "6px" }}
    >
      {children}
    </span>
  );
}
