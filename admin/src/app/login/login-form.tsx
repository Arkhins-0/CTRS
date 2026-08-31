"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-fg-muted">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full border border-line px-3 py-2 text-sm outline-none focus:border-f1-red"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-fg-muted">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full border border-line px-3 py-2 text-sm outline-none focus:border-f1-red"
        />
      </label>
      {state?.error ? (
        <p className="border-l-4 border-f1-red bg-red-50 px-3 py-2 text-sm text-f1-red">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="chamfer-tr w-full bg-f1-red px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-f1-red-dark disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
