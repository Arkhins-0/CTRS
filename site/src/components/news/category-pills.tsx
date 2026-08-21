import Link from "next/link";

/** Category filter for the news hubs — a scrollable row of system pills,
 *  "All" first, the current category filled with the brand accent. */
export function CategoryPills({
  categories,
  activeSlug,
}: {
  categories: { slug: string; name: string }[];
  activeSlug: string | null;
}) {
  if (!categories.length) return null;

  const pill = (active: boolean) =>
    `btn btn-sm shrink-0 ${active ? "btn-brand" : "btn-tonal"}`;

  return (
    <nav
      aria-label="News categories"
      className="flex flex-wrap items-center gap-2 max-md:flex-nowrap max-md:overflow-x-auto max-md:scrollbar-none"
    >
      <Link
        href="/latest"
        aria-current={activeSlug === null ? "page" : undefined}
        className={pill(activeSlug === null)}
      >
        All
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/latest/${c.slug}`}
          aria-current={activeSlug === c.slug ? "page" : undefined}
          className={pill(activeSlug === c.slug)}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
