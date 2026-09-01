import { readableOn, whiteScreenFails } from "./colors";

/* ── Shared pieces for the driver/team profile pages (F1.com-style) ────────
   White stat cards on a light band, and the halftone team-colour wash the
   homepage podium cards introduced — kept in one place so the profile pages
   and the season band never drift apart visually. ─────────────────────────── */

/**
 * The halftone dot screen over a flat team colour. Takes the BACKGROUND it
 * sits on: the ink normally follows the same light/dark split as the text,
 * except on the colours where a white screen cannot register at all — see
 * whiteScreenFails() for why a pure red is the case that breaks the rule.
 */
export function HalftoneWash({ on }: { on: string }) {
  const ink =
    readableOn(on) === "#0a0a0a" || whiteScreenFails(on)
      ? "rgba(0,0,0,0.16)"
      : "rgba(255,255,255,0.15)";
  return <span aria-hidden className="halftone absolute inset-0" style={{ color: ink }} />;
}

/** White bordered stat card: small uppercase label over a big numeral —
 *  the F1.com profile-page stat treatment. */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string | null;
}) {
  return (
    <div className="rounded-md border border-surface-4 bg-surface-1 p-4">
      <p className="body-xs font-semibold uppercase text-text-3">{label}</p>
      <p className="technical-2xl lg:technical-3xl mt-3 font-bold text-text-5">
        {value}
        {hint ? (
          <span className="body-s ml-2 align-middle font-semibold text-text-3">{hint}</span>
        ) : null}
      </p>
    </div>
  );
}

/** Text-valued variant (full team name, base, place of birth — words, not
 *  numerals, so the display face instead of the timing face). */
export function FactCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-surface-4 bg-surface-1 p-4">
      <p className="body-xs font-semibold uppercase text-text-3">{label}</p>
      <p className="display-l mt-2 flex items-center gap-2 font-medium text-text-5">{value}</p>
    </div>
  );
}
