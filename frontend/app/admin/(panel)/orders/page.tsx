"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyRow, LoadState, PageHeader, Pager, RequirePermission, Table, Td } from "@/components/admin/parts";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { Input, StatusBadge } from "@/components/ui";
import { dateTime, money, titleCase } from "@/lib/format";
import type { AdminOrder } from "@/lib/types";

const STATUSES = ["", "pending", "paid", "processing", "shipped", "delivered", "cancelled"];

function OrderList() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, meta, loading, error } = useAdminQuery<AdminOrder[]>("/admin/orders", { status, q: search, page });

  return (
    <>
      <PageHeader title="Orders" description="Track and update customer orders." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by status">
          {STATUSES.map((value) => (
            <button
              key={value || "all"}
              type="button"
              role="tab"
              aria-selected={status === value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm ${status === value ? "bg-neutral-900 font-medium text-white dark:bg-white dark:text-black" : "hover:bg-neutral-200 dark:hover:bg-neutral-800"}`}
            >
              {value ? titleCase(value) : "All"}
            </button>
          ))}
        </div>
        <form
          className="ml-auto w-full sm:w-72"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(q.trim());
            setPage(1);
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order number, name or email" aria-label="Search orders" maxLength={100} className="!rounded-lg" />
        </form>
      </div>

      <LoadState loading={loading && !data} error={error}>
        <Table head={["Order", "Customer", "Date", "Items", "Status", "Total"]}>
          {data?.length === 0 ? (
            <EmptyRow colSpan={6}>No orders found.</EmptyRow>
          ) : (
            data?.map((order) => (
              <tr key={order.id} className={loading ? "opacity-60" : ""}>
                <Td>
                  <Link href={`/admin/orders/${order.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                    {order.order_number}
                  </Link>
                </Td>
                <Td>
                  <p className="font-medium">{order.customer?.name}</p>
                  <p className="text-xs text-neutral-500">{order.customer?.email}</p>
                </Td>
                <Td>{dateTime(order.created_at)}</Td>
                <Td>{order.items_count}</Td>
                <Td>
                  <StatusBadge status={order.status} />
                </Td>
                <Td className="font-medium">{money(order.total)}</Td>
              </tr>
            ))
          )}
        </Table>
        <Pager meta={meta} onPage={setPage} />
      </LoadState>
    </>
  );
}

export default function OrdersPage() {
  return (
    <RequirePermission permission="orders.view">
      <OrderList />
    </RequirePermission>
  );
}
