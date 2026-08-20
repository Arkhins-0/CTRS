import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { COUNTRIES } from "./countries";

/**
 * Shared fan-zone form primitives. No hooks / no directives so they can be
 * used from both server components and "use client" forms.
 */

export const inputClass =
  "w-full border border-line bg-panel px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-fg-faint focus:border-accent";

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
        className="mb-1 block text-xs font-bold uppercase tracking-wide text-fg-faint"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-fg-faint">{hint}</p> : null}
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
      className="border-l-4 border-red-500 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400"
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
      className="border-l-4 border-emerald-500 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-400"
    >
      {children}
    </div>
  );
}
