"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Img } from "@/components/store/Img";
import { RequireAuth } from "@/components/store/RequireAuth";
import { Alert, ButtonLink, PageSpinner, StatusBadge } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { dateTime, money } from "@/lib/format";
import type { OrderDetail } from "@/lib/types";

const steps = ["paid", "processing", "shipped", "delivered"] as const;

function OrderView() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const placed = useSearchParams().get("placed") === "1";
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<OrderDetail>(`/orders/${encodeURIComponent(orderNumber)}`, { scope: "customer" })
      .then((res) => setOrder(res.data))
      .catch((e) => setError(e instanceof ApiError && e.status === 404 ? "We could not find that order." : "Could not load the order."));
  }, [orderNumber]);

  if (error) {
    return (
      <div className="space-y-4">
        <Alert>{error}</Alert>
        <ButtonLink href="/account/orders" variant="outline">
          Back to my orders
        </ButtonLink>
      </div>
    );
  }
  if (!order) return <PageSpinner />;

  const address = order.shipping_address;
  const stepIndex = steps.indexOf(order.status as (typeof steps)[number]);

  return (
    <div className="space-y-6">
      {placed && order.status !== "pending" && (
        <div className="rounded-3xl bg-black p-6 text-white sm:p-8">
          <h2 className="display text-3xl">Thank you for your order!</h2>
          <p className="mt-2 text-white/70">We emailed a confirmation. Your order number is {order.order_number}.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{order.order_number}</h1>
          <p className="text-sm text-black/60">Placed on {dateTime(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.status === "cancelled" ? (
        <Alert tone="info">This order was cancelled{order.cancelled_at ? ` on ${dateTime(order.cancelled_at)}` : ""}. Any payment is being refunded.</Alert>
      ) : order.status === "pending" ? (
        <Alert tone="info">We are waiting for your payment to be confirmed.</Alert>
      ) : (
        <ol className="grid grid-cols-4 gap-2 text-center text-xs sm:text-sm" aria-label="Order progress">
          {steps.map((step, index) => (
            <li key={step}>
              <div className={`h-1.5 rounded-full ${index <= stepIndex ? "bg-black" : "bg-surface"}`} />
              <span className={`mt-2 block capitalize ${index <= stepIndex ? "font-medium" : "text-black/40"}`}>{step}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="rounded-3xl border border-black/10 px-4 sm:px-6" aria-label="Items">
          <ul className="divide-y divide-black/10">
            {order.items.map((item) => (
              <li key={`${item.sku}-${item.size}-${item.color}`} className="flex items-center gap-4 py-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface">
                  <Img src={item.image} alt="" sizes="64px" />
                </div>
                <div className="min-w-0 flex-1">
                  {item.slug ? (
                    <Link href={`/products/${item.slug}`} className="block truncate font-medium hover:underline">
                      {item.product_name}
                    </Link>
                  ) : (
                    <span className="block truncate font-medium">{item.product_name}</span>
                  )}
                  {(item.size || item.color) && (
                    <p className="text-sm text-black/60">{[item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`].filter(Boolean).join(" · ")}</p>
                  )}
                  <p className="text-sm text-black/60">
                    {money(item.unit_price)} × {item.quantity}
                  </p>
                </div>
                <span className="font-bold">{money(item.line_total)}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-black/10 p-5" aria-label="Totals">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-black/60">Subtotal</dt>
                <dd>{money(order.subtotal)}</dd>
              </div>
              {Number(order.discount_total) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-black/60">Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt>
                  <dd className="text-sale">-{money(order.discount_total)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-black/60">Delivery</dt>
                <dd>{money(order.shipping_total)}</dd>
              </div>
              <div className="flex justify-between border-t border-black/10 pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd>{money(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-black/10 p-5 text-sm" aria-label="Shipping address">
            <h2 className="mb-2 font-bold">Shipping to</h2>
            <address className="not-italic leading-6 text-black/70">
              {address.name}
              <br />
              {address.address_line1}
              {address.address_line2 && (
                <>
                  <br />
                  {address.address_line2}
                </>
              )}
              <br />
              {address.city}
              {address.state ? `, ${address.state}` : ""} {address.postal_code}
              <br />
              {address.country} · {address.phone}
            </address>
          </section>
        </div>
      </div>

      <ButtonLink href="/account/orders" variant="outline">
        Back to my orders
      </ButtonLink>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <RequireAuth>
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <Suspense fallback={<PageSpinner />}>
          <OrderView />
        </Suspense>
      </div>
    </RequireAuth>
  );
}
