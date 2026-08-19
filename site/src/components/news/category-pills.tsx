import Link from "next/link";

/** Category filter pills for the news hub — "All" first, active pill in red. */
export function CategoryPills({
  categories,
  activeSlug,
}: {
  categories: { slug: string; name: string }[];
  activeSlug: string | null;
}) {
  const pillClass = (active: boolean) =>
    `chamfer-tr px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
      active
        ? "bg-f1-red text-white"
        : "border border-warm-grey bg-white text-carbon hover:border-f1-red hover:text-f1-red"
    }`;

  return (
    <nav aria-label="News categories" className="flex flex-wrap gap-2">
      <Link href="/latest" className={pillClass(activeSlug === null)}>
        All
      </Link>
      {categories.map((c) => (
        <Link key={c.slug} href={`/latest/${c.slug}`} className={pillClass(activeSlug === c.slug)}>
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
