import { discountPercent, money } from "@/lib/format";

/** Current price, old price crossed out, and a red "-20%" pill when discounted. */
export function Price({ price, discountPrice, size = "md" }: { price: string; discountPrice: string | null; size?: "md" | "lg" }) {
  const percent = discountPercent(price, discountPrice);
  const big = size === "lg";

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className={`font-bold ${big ? "text-3xl" : "text-lg"}`}>{money(discountPrice ?? price)}</span>
      {discountPrice && (
        <>
          <span className={`font-bold text-black/40 line-through ${big ? "text-3xl" : "text-lg"}`}>{money(price)}</span>
          <span className="rounded-full bg-sale/10 px-3 py-1 text-xs font-medium text-sale">-{percent}%</span>
        </>
      )}
    </div>
  );
}
