"use client";

import type { ApiMeta } from "@/lib/api";
import { pageNumbers } from "@/lib/pagination";

/** Numbered pager for lists that load their pages with state (not with the address bar). */
export function ClientPager({ meta, onPage }: { meta: ApiMeta | null; onPage: (page: number) => void }) {
  if (!meta || meta.last_page <= 1) return null;

  const item = "flex h-10 min-w-10 items-center justify-center gap-2 rounded-lg border border-black/10 px-3 text-sm font-medium hover:bg-surface disabled:opacity-40";

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-2 border-t border-black/10 pt-5">
      <button type="button" className={item} disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)}>
        <span aria-hidden>&larr;</span> Previous
      </button>
      <div className="flex flex-wrap items-center justify-center gap-1">
        {pageNumbers(meta.current_page, meta.last_page).map((page, index) =>
          page === "…" ? (
            <span key={`gap-${index}`} className="px-1 text-black/40">
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPage(page)}
              aria-current={page === meta.current_page ? "page" : undefined}
              className={`${item} ${page === meta.current_page ? "!bg-surface" : "border-transparent"}`}
            >
              {page}
            </button>
          ),
        )}
      </div>
      <button type="button" className={item} disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)}>
        Next <span aria-hidden>&rarr;</span>
      </button>
    </nav>
  );
}
