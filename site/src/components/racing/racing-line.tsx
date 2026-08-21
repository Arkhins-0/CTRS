/** Decorative "racing line" motif used as a section/hero separator. Colour is
 *  inherited (`currentColor`), so callers set text-brand / text-white. */
export function RacingLine({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 16"
      preserveAspectRatio="none"
      className={`h-4 w-full ${className}`}
    >
      <path
        d="M0 13 C 120 13, 170 3, 300 3 S 480 13, 620 13 S 830 2, 950 3 S 1130 12, 1200 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
