"use client";

import Link from "next/link";
import { useActionState } from "react";
import { memberLoginAction } from "./actions";

const fieldClass =
  "w-full min-h-11 border border-line bg-page px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-accent";

export function MemberLoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(memberLoginAction, undefined);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-fg-muted">
          Email
        </span>
        <input name="email" type="email" required autoComplete="email" className={fieldClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-fg-muted">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={fieldClass}
        />
      </label>
      {state?.error ? (
        <p className="border-l-4 border-f1-red bg-f1-red/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="chamfer-tr min-h-11 w-full bg-accent px-4 text-sm font-bold uppercase tracking-wide text-accent-fg transition-colors hover:bg-accent-dark disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="pt-1 text-center">
        <Link
          href="/m/forgot-password"
          className="text-xs font-bold uppercase tracking-wide text-fg-faint transition-colors hover:text-fg"
        >
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
