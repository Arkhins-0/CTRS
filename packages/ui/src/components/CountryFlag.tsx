/**
 * Flag for an ISO 3166-1 alpha-2 country code, drawn from the SVG set in
 * each app's /public/flags (hampusborgos/country-flags, public domain).
 *
 * These used to be emoji, which broke on the platform most of the admin is
 * used from: Windows ships no flag glyphs, so every flag fell back to the
 * two letters of the country code — that is why standings-tables.tsx had a
 * note about printing "IN IN" if it rendered the code alongside the flag.
 *
 * Sized in `em`, not pixels, so it still behaves exactly like the glyph it
 * replaces: every existing caller passing text-base / text-lg / text-xl
 * keeps working untouched, and the flag scales with whatever type size it
 * sits in. 3:2 is the set's ratio for all but a handful of flags; those few
 * are cropped by object-cover rather than letterboxed into the line.
 */
export function CountryFlag({
  code,
  className = "",
}: {
  code: string | null | undefined;
  className?: string;
}) {
  if (!code || code.length !== 2) return null;
  const cc = code.toLowerCase();
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG sized
    // in em; next/image cannot size against the surrounding font-size, and
    // optimising a 1KB vector would cost more than it saves.
    <img
      src={`/flags/${cc}.svg`}
      alt={code.toUpperCase()}
      width={24}
      height={16}
      loading="lazy"
      decoding="async"
      // Inline, not a utility class: Tailwind emits no rule for
      // align-[-0.15em], so as a class this silently did nothing and the
      // flag sat high on the baseline.
      style={{ verticalAlign: "-0.15em" }}
      className={`inline-block h-[1em] w-[1.5em] shrink-0 rounded-[0.125em] object-cover ${className}`}
    />
  );
}
