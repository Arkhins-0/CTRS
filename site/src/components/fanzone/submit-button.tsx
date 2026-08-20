"use client";

import { useFormStatus } from "react-dom";

/** Accent primary (or dark/ghost) submit button with a pending state. */
export function SubmitButton({
  label,
  pendingLabel = "Please wait…",
  tone = "red",
  className = "",
}: {
  label: string;
  pendingLabel?: string;
  tone?: "red" | "dark" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const toneClass =
    tone === "dark"
      ? "border border-line bg-panel text-white hover:border-accent"
      : tone === "ghost"
        ? "border border-line bg-transparent text-fg-muted hover:border-accent hover:text-accent"
        : "bg-accent text-accent-fg hover:bg-accent-dark";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`chamfer-tr inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${toneClass} ${className}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
