"use client";

import { useFormStatus } from "react-dom";

/** Pill submit button (brand primary / black / stroke) with a pending state. */
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
    tone === "dark" ? "btn-black" : tone === "ghost" ? "btn-stroke" : "btn-brand";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn btn-md ${toneClass} ${className}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
