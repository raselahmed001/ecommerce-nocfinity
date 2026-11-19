"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClientPager } from "@/components/store/ClientPager";
import { RequireAuth } from "@/components/store/RequireAuth";
import { ButtonLink, PageSpinner, StatusBadge, Alert } from "@/components/ui";
import { ApiError, api, type ApiMeta } from "@/lib/api";
import { date, money } from "@/lib/format";
import type { Order } from "@/lib/types";

function OrderList() {
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<Order[]>("/orders", { scope: "customer", query: { page } })
      .then((res) => {
        if (cancelled) return;
        setOrders(res.data);
        setMeta(res.meta ?? null);
      })
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : "Could not load your orders."));
    return () => {
      cancelled = true;
    };
  }, [page]);

  if (error) return <Alert>{error}</Alert>;
  if (!orders) return <PageSpinner />;

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl bg-surface p-10 text-center">
        <p className="text-lg font-bold">You have not placed any orders yet</p>
        <ButtonLink href="/products" className="mt-5">
          Start shopping
        </ButtonLink>
      </div>
    );
  }

  return (
    <>
      {/* Table on larger screens, cards on phones */}
      <div className="hidden overflow-hidden rounded-3xl border border-black/10 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-black/60">
            <tr>
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Items</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {orders.map((order) => (
              <tr key={order.order_number} className="hover:bg-surface/50">
                <td className="px-5 py-4 font-medium">
                  <Link href={`/account/orders/${order.order_number}`} className="underline">
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-5 py-4">{date(order.created_at)}</td>
                <td className="px-5 py-4">{order.items_count}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-5 py-4 text-right font-bold">{money(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {orders.map((order) => (
          <li key={order.order_number}>
            <Link href={`/account/orders/${order.order_number}`} className="block rounded-2xl border border-black/10 p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold">{order.order_number}</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-black/60">
                <span>
                  {date(order.created_at)} · {order.items_count} items
                </span>
                <span className="font-bold text-black">{money(order.total)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <ClientPager meta={meta} onPage={setPage} />
    </>
  );
}

export default function MyOrdersPage() {
  return (
    <RequireAuth>
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <h1 className="display mb-6 text-4xl sm:text-5xl">My orders</h1>
        <OrderList />
      </div>
    </RequireAuth>
  );
}
