"use client";

import { useFormStatus } from "react-dom";

/** Red primary (or dark/ghost) submit button with a pending state. */
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
      ? "bg-carbon text-white hover:bg-carbon-700"
      : tone === "ghost"
        ? "border border-warm-grey bg-white text-f1-grey hover:border-f1-red hover:text-f1-red"
        : "bg-f1-red text-white hover:bg-f1-red-dark";
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
