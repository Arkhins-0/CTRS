"use client";

import { useActionState } from "react";
import { DevNote } from "@/components/fanzone/dev-note";
import { Field, FormError, FormSuccess, TextInput } from "@/components/fanzone/form";
import { SubmitButton } from "@/components/fanzone/submit-button";
import { subscribeToNewsletter, type NewsletterState } from "./actions";

const initialState: NewsletterState = {
  error: null,
  done: false,
  email: null,
  status: null,
  token: null,
};

export function NewsletterForm({ defaultEmail }: { defaultEmail: string | null }) {
  const [state, formAction] = useActionState(subscribeToNewsletter, initialState);

  if (state.done && state.status === "confirmed") {
    return (
      <FormSuccess>
        {state.email} is already subscribed — you&apos;re all set for race week.
      </FormSuccess>
    );
  }

  if (state.done) {
    return (
      <div className="space-y-4">
        <FormSuccess>
          Almost there — check your inbox and confirm your subscription for{" "}
          <strong>{state.email}</strong>.
        </FormSuccess>
        {state.token ? <DevNote confirmHref={`/newsletter/confirm/${state.token}`} /> : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError>{state.error}</FormError>

      <Field label="Email" htmlFor="email">
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={defaultEmail ?? undefined}
          required
          maxLength={255}
        />
      </Field>

      <SubmitButton label="Subscribe" pendingLabel="Subscribing…" className="w-full" />

      <p className="text-xs text-fg-faint">
        One email per race week. Unsubscribe any time from your account.
      </p>
    </form>
  );
}
