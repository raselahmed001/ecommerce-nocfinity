/** Page numbers to show, with "…" for gaps: 1 … 4 5 6 … 20. */
export function pageNumbers(current: number, last: number): (number | "…")[] {
  const wanted = Array.from({ length: last }, (_, i) => i + 1).filter((page) => page === 1 || page === last || Math.abs(page - current) <= 1);
  const out: (number | "…")[] = [];

  wanted.forEach((page, index) => {
    if (index > 0 && page - (wanted[index - 1] as number) > 1) out.push("…");
    out.push(page);
  });

  return out;
}
