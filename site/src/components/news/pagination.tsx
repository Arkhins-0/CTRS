import Link from "next/link";

/** Previous / next pagination controls in the site's dark chamfered style. */
export function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`);
  const buttonClass =
    "chamfer-tr bg-carbon px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-f1-red";
  const disabledClass =
    "chamfer-tr cursor-not-allowed bg-warm-grey px-4 py-2 text-xs font-bold uppercase tracking-wide text-f1-grey-light";

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
      {page > 1 ? (
        <Link href={href(page - 1)} className={buttonClass}>
          ← Previous
        </Link>
      ) : (
        <span aria-disabled className={disabledClass}>
          ← Previous
        </span>
      )}

      <span className="text-sm font-bold uppercase tracking-wide text-f1-grey">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={href(page + 1)} className={buttonClass}>
          Next →
        </Link>
      ) : (
        <span aria-disabled className={disabledClass}>
          Next →
        </span>
      )}
    </nav>
  );
}
