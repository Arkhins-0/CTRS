/** Emoji flag from an ISO 3166-1 alpha-2 country code — no image assets needed. */
export function CountryFlag({
  code,
  className = "",
}: {
  code: string | null | undefined;
  className?: string;
}) {
  if (!code || code.length !== 2) return null;
  const flag = String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
  return (
    <span role="img" aria-label={code.toUpperCase()} className={className}>
      {flag}
    </span>
  );
}
