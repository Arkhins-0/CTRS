import { RacingLine } from "@/components/racing/racing-line";

/* ── Legal document layout ─────────────────────────────────────────────────
   Shared by the Privacy Policy and Terms of Use: document header (eyebrow,
   title, effective date), a sticky "On this page" contents rail on desktop,
   and numbered anchor-linked sections. Pure presentation — each page owns
   its words. ─────────────────────────────────────────────────────────────── */

export type LegalSection = {
  id: string;
  title: string;
  body: React.ReactNode;
};

/** Paragraph with the document's body style — use inside section bodies. */
export function P({ children }: { children: React.ReactNode }) {
  return <p className="body-m text-text-4">{children}</p>;
}

/** Bulleted list with the document's body style. */
export function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="body-m flex list-disc flex-col gap-2 pl-5 text-text-4 marker:text-text-3">
      {children}
    </ul>
  );
}

/** Definition-style lead: bold term, then the explanation in the same line. */
export function Term({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <li>
      <strong className="font-bold text-text-5">{term}</strong> — {children}
    </li>
  );
}

export function LegalPage({
  title,
  effectiveDate,
  intro,
  sections,
}: {
  title: string;
  effectiveDate: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <main>
      {/* document header */}
      <section className="bg-surface-1">
        <div className="f1-inner py-10 lg:py-14">
          <div className="text-brand">
            <RacingLine className="max-w-40" />
          </div>
          <p className="body-xs mt-4 font-bold uppercase tracking-wide text-text-3">Legal</p>
          <h1 className="display-3xl lg:display-4xl mt-2 font-black uppercase text-text-5">
            {title}
          </h1>
          <p className="body-s mt-4 font-semibold text-text-3">
            Effective date: {effectiveDate}
          </p>
          <div className="mt-6 flex max-w-[720px] flex-col gap-4">{intro}</div>
        </div>
      </section>

      {/* contents + sections */}
      <section className="border-t border-surface-4 bg-surface-2">
        <div className="f1-inner grid gap-10 py-10 lg:grid-cols-[260px_1fr] lg:gap-16 lg:py-14">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <p className="body-xs font-bold uppercase tracking-wide text-text-3">
              On this page
            </p>
            <ol className="mt-4 flex flex-col gap-2.5">
              {sections.map((s, i) => (
                <li key={s.id} className="flex gap-2.5">
                  <span className="technical-xs mt-0.5 w-5 shrink-0 text-right font-bold text-text-3">
                    {i + 1}.
                  </span>
                  <a
                    href={`#${s.id}`}
                    className="body-xs font-semibold text-text-4 decoration-2 underline-offset-2 hover:underline"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex max-w-[760px] flex-col gap-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="display-l lg:display-xl flex gap-3 font-bold uppercase text-text-5">
                  <span className="text-text-3">{i + 1}.</span>
                  {s.title}
                </h2>
                <div className="mt-4 flex flex-col gap-4">{s.body}</div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
