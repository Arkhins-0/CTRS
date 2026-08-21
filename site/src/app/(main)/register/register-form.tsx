"use client";

import { useActionState } from "react";
import { CountrySelect, Field, FormError, TextInput } from "@/components/fanzone/form";
import { SubmitButton } from "@/components/fanzone/submit-button";
import { registerFan, type RegisterState } from "./actions";

const initialState: RegisterState = { error: null };

export function RegisterForm() {
  const [state, formAction] = useActionState(registerFan, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError>{state.error}</FormError>

      <Field label="Display name" htmlFor="displayName">
        <TextInput
          id="displayName"
          name="displayName"
          autoComplete="nickname"
          placeholder="e.g. BoxBoxBala"
          required
          minLength={2}
          maxLength={120}
        />
      </Field>

      <Field label="Email" htmlFor="email">
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          maxLength={255}
        />
      </Field>

      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
        />
      </Field>

      <Field label="Country (optional)" htmlFor="countryCode">
        <CountrySelect id="countryCode" />
      </Field>

      <label className="body-s flex cursor-pointer items-start gap-3 text-text-3">
        <input
          type="checkbox"
          name="newsletter"
          className="mt-1.5 accent-[color:var(--f1-text-5)]"
        />
        <span>
          Sign me up for the{" "}
          <strong className="font-bold text-text-5">race week newsletter</strong> — the biggest
          stories, straight to my inbox.
        </span>
      </label>

      <SubmitButton label="Create account" pendingLabel="Creating…" className="w-full" />
    </form>
  );
}
