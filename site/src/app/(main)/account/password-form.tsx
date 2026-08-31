"use client";

import { useActionState } from "react";
import { Field, FormError, FormSuccess, TextInput } from "@/components/fanzone/form";
import { SubmitButton } from "@/components/fanzone/submit-button";
import { changePassword, type PasswordState } from "./actions";

const initialState: PasswordState = { error: null, ok: false };

export function PasswordForm() {
  const [state, formAction] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="space-y-4" key={state.ok ? "reset" : "form"}>
      <FormError>{state.error}</FormError>
      {state.ok ? <FormSuccess>Password updated. Other devices were signed out.</FormSuccess> : null}

      <Field label="Current password" htmlFor="currentPassword">
        <TextInput
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field label="New password" htmlFor="newPassword" hint="At least 8 characters.">
        <TextInput
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field label="Confirm new password" htmlFor="confirmPassword">
        <TextInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <SubmitButton label="Update password" pendingLabel="Updating…" />
    </form>
  );
}
