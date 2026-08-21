import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { COUNTRIES } from "./countries";

/**
 * Shared fan-zone form primitives. No hooks / no directives so they can be
 * used from both server components and "use client" forms.
 */

export const inputClass =
  "w-full rounded-md border border-surface-4 bg-surface-1 px-4 py-2.5 body-s text-text-5 placeholder:text-text-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-5";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="body-xs mb-1.5 block font-semibold uppercase text-text-3"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="body-xs mt-1.5 text-text-3">{hint}</p> : null}
    </div>
  );
}

export function TextInput({
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${className}`} {...rest} />;
}

export function SelectInput({
  className = "",
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${inputClass} ${className}`} {...rest} />;
}

export function CountrySelect({
  id,
  name = "countryCode",
  defaultValue,
}: {
  id?: string;
  name?: string;
  defaultValue?: string | null;
}) {
  return (
    <SelectInput id={id} name={name} defaultValue={defaultValue ?? ""}>
      <option value="">— No country —</option>
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </SelectInput>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="body-xs font-semibold text-negative">
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div role="status" className="body-xs font-semibold text-positive">
      {children}
    </div>
  );
}
