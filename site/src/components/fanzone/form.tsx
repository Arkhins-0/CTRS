import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { COUNTRIES } from "./countries";

/**
 * Shared fan-zone form primitives. No hooks / no directives so they can be
 * used from both server components and "use client" forms.
 */

export const inputClass =
  "w-full border border-warm-grey bg-white px-3 py-2 text-sm text-carbon outline-none transition-colors placeholder:text-f1-grey-light focus:border-f1-red";

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
        className="mb-1 block text-xs font-bold uppercase tracking-wide text-f1-grey"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-f1-grey-light">{hint}</p> : null}
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
    <div
      role="alert"
      className="border-l-4 border-f1-red bg-f1-red/5 px-3 py-2 text-sm font-semibold text-f1-red"
    >
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="status"
      className="border-l-4 border-emerald-600 bg-emerald-600/5 px-3 py-2 text-sm font-semibold text-emerald-700"
    >
      {children}
    </div>
  );
}
