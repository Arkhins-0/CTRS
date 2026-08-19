"use client";

import { useActionState } from "react";
import {
  CountrySelect,
  Field,
  FormError,
  FormSuccess,
  TextInput,
} from "@/components/fanzone/form";
import { SubmitButton } from "@/components/fanzone/submit-button";
import { updateProfile, type ProfileState } from "./actions";

const initialState: ProfileState = { error: null, ok: false };

export function ProfileForm({
  defaultDisplayName,
  defaultCountryCode,
}: {
  defaultDisplayName: string;
  defaultCountryCode: string | null;
}) {
  const [state, formAction] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <FormError>{state.error}</FormError>
      {state.ok ? <FormSuccess>Profile updated.</FormSuccess> : null}

      <Field label="Display name" htmlFor="displayName">
        <TextInput
          id="displayName"
          name="displayName"
          defaultValue={defaultDisplayName}
          required
          minLength={2}
          maxLength={120}
        />
      </Field>

      <Field label="Country" htmlFor="countryCode">
        <CountrySelect id="countryCode" defaultValue={defaultCountryCode} />
      </Field>

      <SubmitButton label="Save changes" pendingLabel="Saving…" />
    </form>
  );
}
