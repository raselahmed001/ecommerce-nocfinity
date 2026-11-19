import Link from "next/link";
import type { ApiMeta } from "@/lib/api";

/** Server-side pagination: each button is a normal link that changes ?page=. */
export function Pagination({ meta, basePath, params }: { meta: ApiMeta; basePath: string; params: Record<string, string | undefined> }) {
  if (meta.last_page <= 1) return null;

  const href = (page: number) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => value && key !== "page" && search.set(key, value));
    if (page > 1) search.set("page", String(page));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const pages = Array.from({ length: meta.last_page }, (_, i) => i + 1).filter(
    (page) => page === 1 || page === meta.last_page || Math.abs(page - meta.current_page) <= 1,
  );

  const item = "flex h-10 min-w-10 items-center justify-center rounded-lg border border-black/10 px-3 text-sm font-medium hover:bg-surface";

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-2 border-t border-black/10 pt-5">
      {meta.current_page > 1 ? (
        <Link href={href(meta.current_page - 1)} className={`${item} gap-2`} rel="prev">
          <span aria-hidden>&larr;</span> Previous
        </Link>
      ) : (
        <span className="w-[6.5rem]" />
      )}
      <div className="flex flex-wrap items-center justify-center gap-1">
      {pages.map((page, index) => (
        <span key={page} className="flex items-center gap-2">
          {index > 0 && page - pages[index - 1] > 1 && <span className="text-black/40">…</span>}
          <Link
            href={href(page)}
            aria-current={page === meta.current_page ? "page" : undefined}
            className={`${item} ${page === meta.current_page ? "!bg-surface" : "border-transparent"}`}
          >
            {page}
          </Link>
        </span>
      ))}
      </div>
      {meta.current_page < meta.last_page ? (
        <Link href={href(meta.current_page + 1)} className={`${item} gap-2`} rel="next">
          Next <span aria-hidden>&rarr;</span>
        </Link>
      ) : (
        <span className="w-[6.5rem]" />
      )}
    </nav>
  );
}
