import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Previous / next pagination — system pill buttons either side of a muted
 *  "Page N of M" caption. Disabled ends render as inert 50%-opacity pills. */
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
  const enabled = "btn btn-sm btn-stroke";
  const disabled = "btn btn-sm btn-stroke pointer-events-none opacity-50";

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={enabled}>
          <ChevronLeft size={16} aria-hidden />
          Previous
        </Link>
      ) : (
        <span aria-disabled className={disabled}>
          <ChevronLeft size={16} aria-hidden />
          Previous
        </span>
      )}

      <span className="body-xs font-bold uppercase text-text-3">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className={enabled}>
          Next
          <ChevronRight size={16} aria-hidden />
        </Link>
      ) : (
        <span aria-disabled className={disabled}>
          Next
          <ChevronRight size={16} aria-hidden />
        </span>
      )}
    </nav>
  );
}
