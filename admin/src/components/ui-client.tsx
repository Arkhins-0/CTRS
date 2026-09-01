"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes } from "react";

/*
 * Submit buttons that show a pending state inside <form action={...}>.
 *
 * CRITICAL: these must NOT set `disabled` while pending. A disabled control is
 * excluded from form submission, so disabling the submitter drops its
 * name/value — and a form with several submit buttons (Save / Publish /
 * Schedule / Archive) reads the pressed button's value to know what was asked
 * for. Doing so silently made every article action save a draft.
 *
 * Pending is conveyed with aria-busy and styling instead, and repeat clicks are
 * blocked with pointer-events rather than the disabled attribute.
 */

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
      aria-busy={pending}
      className={`chamfer-tr inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        pending ? "pointer-events-none opacity-50" : ""
      } ${styles} ${className}`}
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
      aria-busy={pending}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
      className={`inline-flex min-h-11 items-center gap-1 rounded-full border border-f1-red bg-surface px-3 text-xs font-bold uppercase text-f1-red transition-colors hover:bg-f1-red hover:text-white ${
        pending ? "pointer-events-none opacity-50" : ""
      } ${className}`}
    >
      {pending ? "…" : children}
    </button>
  );
}

/**
 * Submit button for forms whose action branches on which button was pressed
 * (Save / Publish / Schedule / Archive).
 *
 * Relying on the submitter's own name/value has proved fragile: anything that
 * makes the button non-submittable at the moment the form is serialised — a
 * `disabled` attribute, a re-render, a stale build — drops the value silently,
 * and the action then falls back to its default and reports success. That is
 * how publish/schedule/archive all quietly saved drafts.
 *
 * So the intent is ALSO written into a hidden field on click. Both entries
 * carry the same value, so whichever survives, the action reads the same
 * thing, and it no longer depends on how the runtime serialises submitters.
 */
export function IntentSubmitButton({
  intent,
  children,
  variant = "primary",
  className = "",
}: {
  intent: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  return (
    <SubmitButton
      name="intent"
      value={intent}
      variant={variant}
      className={className}
      onClick={(e) => {
        const form = e.currentTarget.form;
        if (!form) return;
        let field = form.querySelector<HTMLInputElement>('input[type="hidden"][name="intent"]');
        if (!field) {
          field = document.createElement("input");
          field.type = "hidden";
          field.name = "intent";
          form.appendChild(field);
        }
        field.value = intent;
      }}
    >
      {children}
    </SubmitButton>
  );
}
