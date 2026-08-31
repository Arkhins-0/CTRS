import { Check, HelpCircle, X } from "lucide-react";
import { setRsvpAction } from "@/app/m/(portal)/schedule/actions";

type Status = "going" | "maybe" | "not_going";

const OPTIONS: { value: Status; label: string; icon: typeof Check }[] = [
  { value: "going", label: "Going", icon: Check },
  { value: "maybe", label: "Maybe", icon: HelpCircle },
  { value: "not_going", label: "Can't", icon: X },
];

/**
 * Availability control for one round.
 *
 * Three separate submit buttons in one form rather than a select: on a phone
 * at a circuit, answering should be a single tap, not tap-scroll-tap-submit.
 */
export function RsvpButtons({ roundId, current }: { roundId: string; current: Status | null }) {
  return (
    <form action={setRsvpAction} className="mt-3 flex gap-1.5">
      <input type="hidden" name="roundId" value={roundId} />
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="submit"
            name="status"
            value={opt.value}
            aria-pressed={active}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 px-2 text-xs font-bold uppercase tracking-wide transition-colors ${
              active
                ? "chamfer-tr bg-accent text-accent-fg"
                : "border border-line text-fg-muted hover:border-fg-faint hover:text-fg"
            }`}
          >
            <Icon size={14} strokeWidth={2.5} />
            {opt.label}
          </button>
        );
      })}
    </form>
  );
}
