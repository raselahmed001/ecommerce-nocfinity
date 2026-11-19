"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/providers/CartProvider";
import { useToast } from "@/components/providers/Toast";
import { Img } from "@/components/store/Img";
import { OrderSummary } from "@/components/store/OrderSummary";
import { QuantityStepper } from "@/components/store/QuantityStepper";
import { Alert, Button, ButtonLink, Input, PageSpinner } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { money } from "@/lib/format";

export default function CartPage() {
  const { cart, loading, setQuantity, remove, applyCoupon, removeCoupon } = useCart();
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading || !cart) return <PageSpinner />;

  const run = async (id: number, action: () => Promise<void>) => {
    setBusyId(id);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof ApiError ? (e.field("quantity") ?? e.message) : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const submitCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return setCouponError("Enter a promo code.");
    setCouponBusy(true);
    setCouponError("");
    try {
      await applyCoupon(code.trim());
      setCode("");
      toast("Promo code applied.");
    } catch (e) {
      setCouponError(e instanceof ApiError ? (e.field("code") ?? e.message) : "Could not apply the code.");
    } finally {
      setCouponBusy(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <h1 className="display text-4xl">Your cart is empty</h1>
        <p className="mt-3 text-black/60">Looks like you have not added anything yet.</p>
        <ButtonLink href="/products" size="lg" className="mt-8">
          Continue shopping
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-5 border-t border-black/10 pt-5 text-sm text-black/60">
        <Link href="/" className="hover:text-black">
          Home
        </Link>
        <span className="mx-2">&rsaquo;</span>
        <span className="text-black">Cart</span>
      </nav>
      <h1 className="display text-4xl sm:text-5xl">Your cart</h1>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_28rem]">
        <section aria-label="Cart items" className="rounded-[1.25rem] border border-black/10 px-4 sm:px-6">
          {error && (
            <div className="pt-4">
              <Alert>{error}</Alert>
            </div>
          )}
          <ul className="divide-y divide-black/10">
            {cart.items.map((item) => {
              const product = item.product;
              const busy = busyId === item.id;
              const max = product ? Math.min(product.stock, 20) : item.quantity;

              return (
                <li key={item.id} className="flex gap-4 py-5">
                  <Link href={product ? `/products/${product.slug}` : "#"} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface sm:h-32 sm:w-32">
                    <Img src={product?.image} alt={product?.name ?? "Unavailable product"} sizes="128px" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-bold sm:text-xl">{product?.name ?? "Unavailable product"}</h2>
                        {item.size && (
                          <p className="text-xs sm:text-sm">
                            Size: <span className="text-black/60">{item.size}</span>
                          </p>
                        )}
                        {item.color && (
                          <p className="text-xs sm:text-sm">
                            Color: <span className="text-black/60">{item.color}</span>
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => run(item.id, () => remove(item.id))}
                        disabled={busy}
                        aria-label={`Remove ${product?.name ?? "item"}`}
                        className="h-fit p-1 text-sale disabled:opacity-40"
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                    {item.issue && <p className="mt-1 text-sm font-medium text-sale">{item.issue}</p>}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg font-bold sm:text-2xl">{money(item.line_total)}</span>
                      <QuantityStepper
                        value={item.quantity}
                        max={Math.max(max, item.quantity)}
                        disabled={busy || !product}
                        onChange={(value) => run(item.id, () => setQuantity(item.id, value))}
                        label={`Quantity of ${product?.name ?? "item"}`}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="h-fit rounded-[1.25rem] border border-black/10 p-5 sm:p-6" aria-label="Order summary">
          <h2 className="mb-5 text-2xl font-bold">Order Summary</h2>
          <OrderSummary cart={cart} />

          {cart.coupon?.error && <div className="mt-4"><Alert>{cart.coupon.error}</Alert></div>}

          {cart.coupon ? (
            <div className="mt-5 flex items-center justify-between rounded-full bg-surface px-5 py-3 text-sm">
              <span>
                Code <strong>{cart.coupon.code}</strong> applied
              </span>
              <button type="button" className="underline" onClick={() => removeCoupon().catch(() => setCouponError("Could not remove the code."))}>
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={submitCoupon} className="mt-5" noValidate>
              <div className="flex gap-3">
                <Input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Add promo code"
                  aria-label="Promo code"
                  maxLength={50}
                  invalid={!!couponError}
                  className="!rounded-full !bg-surface !border-transparent"
                />
                <Button type="submit" loading={couponBusy} className="px-8">
                  Apply
                </Button>
              </div>
              {couponError && (
                <p role="alert" className="mt-2 text-sm text-red-600">
                  {couponError}
                </p>
              )}
            </form>
          )}

          {cart.has_issues ? (
            <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-800">Fix the items marked above before you check out.</p>
          ) : (
            <ButtonLink href="/checkout" size="lg" className="mt-6 w-full">
              Go to Checkout →
            </ButtonLink>
          )}
        </aside>
      </div>
    </div>
  );
}
