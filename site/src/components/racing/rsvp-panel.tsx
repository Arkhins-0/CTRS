"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

type RsvpStatus = "going" | "maybe" | "not_going";
type Counts = { going: number; maybe: number; notGoing: number };

const OPTIONS: { status: RsvpStatus; label: string }[] = [
  { status: "going", label: "I'm going" },
  { status: "maybe", label: "Maybe" },
  { status: "not_going", label: "Can't make it" },
];

/**
 * Fan attendance widget (adapted from OpenLeague's RSVPButtons — optimistic
 * selection, ≥48px touch targets). The surrounding page is statically cached;
 * everything per-fan lives behind /api/rsvp.
 */
export function RsvpPanel({ roundId }: { roundId: string }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [mine, setMine] = useState<RsvpStatus | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rsvp?roundId=${roundId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { counts: Counts; mine: RsvpStatus | null; signedIn: boolean } | null) => {
        if (cancelled || !data) return;
        setCounts(data.counts);
        setMine(data.mine);
        setSignedIn(data.signedIn);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [roundId]);

  const submit = (status: RsvpStatus) => {
    const next = mine === status ? "clear" : status;
    const before = mine;
    setMine(next === "clear" ? null : status); // optimistic
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/rsvp", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ roundId, status: next }),
        });
        const data = (await res.json()) as {
          counts?: Counts;
          mine?: RsvpStatus | null;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Something went wrong — try again.");
        setCounts(data.counts ?? null);
        setMine(data.mine ?? null);
      } catch (err) {
        setMine(before); // roll back
        setError(err instanceof Error ? err.message : "Something went wrong — try again.");
      }
    });
  };

  if (signedIn === false) {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/login" className="btn btn-md btn-brand">
          Sign in to RSVP
        </Link>
        {counts ? <AttendanceLine counts={counts} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3" role="group" aria-label="Will you attend this round?">
        {OPTIONS.map(({ status, label }) => {
          const active = mine === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              disabled={pending || signedIn === null}
              onClick={() => submit(status)}
              className={`min-h-12 px-5 text-sm font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "bg-accent text-accent-fg"
                  : "border border-line bg-transparent text-text-5 hover:border-text-5"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {counts ? <AttendanceLine counts={counts} /> : null}
      {error ? (
        <p role="alert" className="body-xs font-semibold text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function AttendanceLine({ counts }: { counts: Counts }) {
  return (
    <p className="body-xs font-semibold text-text-3" aria-live="polite">
      {counts.going} going · {counts.maybe} maybe
    </p>
  );
}
