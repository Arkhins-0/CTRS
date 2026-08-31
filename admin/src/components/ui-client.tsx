"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";

/** Submit button that shows a pending state inside <form action={...}>. */
export function SubmitButton({
  children,
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const { pending } = useFormStatus();
  // Mirrors btnStyles in ui.tsx — keep the two in step.
  const styles =
    variant === "secondary"
      ? "bg-panel text-fg hover:bg-line"
      : variant === "danger"
        ? "bg-surface border border-f1-red text-f1-red hover:bg-f1-red hover:text-white"
        : "bg-accent text-accent-fg hover:bg-accent-dark";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`chamfer-tr inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...rest}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

/** Confirm-before-submit wrapper for destructive form actions. */
export function ConfirmSubmit({
  children,
  message = "Are you sure? This cannot be undone.",
  className = "",
}: {
  children: React.ReactNode;
  message?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
      className={`chamfer-tr inline-flex items-center gap-1 border border-f1-red bg-surface px-3 py-1.5 text-xs font-bold uppercase text-f1-red transition-colors hover:bg-f1-red hover:text-white disabled:opacity-50 ${className}`}
    >
      {pending ? "…" : children}
    </button>
  );
}
