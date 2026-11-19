"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { Card, EmptyRow, LoadState, PageHeader, Pager, RequirePermission, Table, Td } from "@/components/admin/parts";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { StatusBadge } from "@/components/ui";
import { date, dateTime, money } from "@/lib/format";
import type { AdminCustomer, AdminOrder } from "@/lib/types";

function CustomerView() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdminAuth();
  const { data, loading, error } = useAdminQuery<AdminCustomer>(`/admin/customers/${encodeURIComponent(id)}`);
  const [page, setPage] = useState(1);
  const history = useAdminQuery<AdminOrder[]>(`/admin/customers/${encodeURIComponent(id)}/orders`, { page });

  return (
    <LoadState loading={loading} error={error}>
      {data && (
        <>
          <PageHeader
            title={data.name}
            description={data.email}
            actions={
              <Link href="/admin/customers" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
                ← All customers
              </Link>
            }
          />
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-neutral-500">Orders</p>
              <p className="mt-1 text-2xl font-bold">{data.orders_count}</p>
            </Card>
            <Card>
              <p className="text-sm text-neutral-500">Total spent</p>
              <p className="mt-1 text-2xl font-bold">{money(data.total_spent)}</p>
            </Card>
            <Card>
              <p className="text-sm text-neutral-500">Customer since</p>
              <p className="mt-1 text-2xl font-bold">{date(data.joined_at)}</p>
            </Card>
          </div>

          <h2 className="mb-3 font-semibold">Order history</h2>
          <Table head={["Order", "Date", "Items", "Status", "Total"]}>
            {history.data?.length === 0 ? (
              <EmptyRow colSpan={5}>This customer has not ordered yet.</EmptyRow>
            ) : (
              history.data?.map((order) => (
                <tr key={order.id}>
                  <Td>
                    {can("orders.view") ? (
                      <Link href={`/admin/orders/${order.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                        {order.order_number}
                      </Link>
                    ) : (
                      order.order_number
                    )}
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
          <Pager meta={history.meta} onPage={setPage} />
        </>
      )}
    </LoadState>
  );
}

export default function CustomerDetailPage() {
  return (
    <RequirePermission permission="customers.view">
      <CustomerView />
    </RequirePermission>
  );
}
