import { Info } from "lucide-react";
import { Card } from "@/components/ui";
import type { DocSection } from "@/lib/docs-content";

/** Renders the typed guide content. Shared by the staff and member guides. */
export function DocsBody({ sections }: { sections: DocSection[] }) {
  return (
    <>
      {/* Contents — the guide is long enough that jumping is worth it. */}
      <Card className="mb-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-fg-faint">Contents</h2>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {sections.map((s) => (
            <li key={s.slug}>
              <a
                href={`#${s.slug}`}
                className="text-sm font-bold text-accent-ink hover:underline"
              >
                {s.title}
              </a>
              <span className="block text-xs text-fg-faint">{s.summary}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4">
        {sections.map((section) => (
          <Card key={section.slug}>
            {/* scroll-mt clears the sticky header when jumped to */}
            <h2
              id={section.slug}
              className="scroll-mt-28 border-l-4 border-accent pl-3 text-lg font-black uppercase tracking-tight text-fg"
            >
              {section.title}
            </h2>

            <div className="mt-3 space-y-3">
              {section.blocks.map((block, i) => {
                if (block.kind === "p") {
                  return (
                    <p key={i} className="text-sm leading-relaxed text-fg-muted">
                      {block.text}
                    </p>
                  );
                }
                if (block.kind === "steps") {
                  return (
                    <ol key={i} className="space-y-2">
                      {block.items.map((item, n) => (
                        <li key={n} className="flex gap-3 text-sm leading-relaxed text-fg-muted">
                          <span className="grid size-6 shrink-0 place-items-center bg-panel font-numeric text-xs font-bold text-fg">
                            {n + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  );
                }
                if (block.kind === "list") {
                  return (
                    <ul key={i} className="space-y-1.5">
                      {block.items.map((item, n) => (
                        <li
                          key={n}
                          className="flex gap-2.5 text-sm leading-relaxed text-fg-muted before:mt-2 before:size-1.5 before:shrink-0 before:bg-accent"
                        >
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p
                    key={i}
                    className="flex gap-2.5 border-l-2 border-line bg-page px-3 py-2 text-sm leading-relaxed text-fg-muted"
                  >
                    <Info size={15} className="mt-0.5 shrink-0 text-fg-faint" />
                    <span>{block.text}</span>
                  </p>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
