"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

export type RelatedOption = { id: string; title: string };

/**
 * Related-articles chooser for the article editor. All candidate articles are
 * passed as props (there are only dozens) and filtered client-side; the
 * chosen list is emitted as ordered hidden inputs (name="relatedIds") so the
 * plain server-action form receives it.
 */
export function RelatedPicker({
  options,
  initial,
  name = "relatedIds",
}: {
  options: RelatedOption[];
  initial: RelatedOption[];
  name?: string;
}) {
  const [selected, setSelected] = useState<RelatedOption[]>(initial);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const chosen = new Set(selected.map((s) => s.id));
    return options
      .filter((o) => !chosen.has(o.id) && o.title.toLowerCase().includes(q))
      .slice(0, 10);
  }, [query, options, selected]);

  return (
    <div>
      {selected.map((s) => (
        <input key={s.id} type="hidden" name={name} value={s.id} />
      ))}

      {selected.length > 0 ? (
        <ul className="mb-2 space-y-1">
          {selected.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center gap-2 border border-line bg-page px-2 py-1.5 text-xs"
            >
              <span className="font-black text-fg-muted">{i + 1}</span>
              <span className="flex-1 truncate" title={s.title}>
                {s.title}
              </span>
              <button
                type="button"
                aria-label={`Remove ${s.title}`}
                onClick={() => setSelected((prev) => prev.filter((p) => p.id !== s.id))}
                className="text-fg-muted transition-colors hover:text-f1-red"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-xs text-fg-muted">No related articles chosen.</p>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search articles to relate…"
        className="w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-f1-red"
      />

      {matches.length > 0 ? (
        <ul className="mt-1 divide-y divide-warm-grey border border-line bg-surface">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected((prev) => [...prev, m]);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors hover:bg-panel"
              >
                <Plus size={13} className="shrink-0 text-f1-red" />
                <span className="truncate">{m.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {query.trim() && matches.length === 0 ? (
        <p className="mt-1 text-xs text-fg-faint">No matches.</p>
      ) : null}
    </div>
  );
}
