import { money } from "@/lib/format";
import type { Cart } from "@/lib/types";

/** Totals exactly as the API calculated them. The browser never computes money. */
export function OrderSummary({ cart }: { cart: Cart }) {
  const row = "flex items-center justify-between";

  return (
    <dl className="space-y-4 text-base">
      <div className={row}>
        <dt className="text-black/60">Subtotal</dt>
        <dd className="font-bold">{money(cart.subtotal)}</dd>
      </div>
      {Number(cart.discount) > 0 && (
        <div className={row}>
          <dt className="text-black/60">
            Discount{cart.coupon ? ` (${cart.coupon.type === "percentage" ? `-${Number(cart.coupon.value)}%` : cart.coupon.code})` : ""}
          </dt>
          <dd className="font-bold text-sale">-{money(cart.discount)}</dd>
        </div>
      )}
      <div className={row}>
        <dt className="text-black/60">Delivery fee</dt>
        <dd className="font-bold">{money(cart.shipping)}</dd>
      </div>
      <div className={`${row} border-t border-black/10 pt-4 text-xl`}>
        <dt>Total</dt>
        <dd className="font-bold">{money(cart.total)}</dd>
      </div>
    </dl>
  );
}
