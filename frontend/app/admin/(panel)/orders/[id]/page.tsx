"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, ConfirmDialog, LoadState, PageHeader, RequirePermission, Table, Td } from "@/components/admin/parts";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { useToast } from "@/components/providers/Toast";
import { Alert, Button, StatusBadge } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { dateTime, money, titleCase } from "@/lib/format";
import type { AdminOrderDetail, OrderStatus } from "@/lib/types";

const actionLabel: Record<string, string> = {
  processing: "Mark as processing",
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
  cancelled: "Cancel order",
};

function OrderView() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdminAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAdminQuery<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(id)}`);
  const [confirm, setConfirm] = useState<OrderStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const change = async (status: OrderStatus) => {
    setBusy(true);
    setActionError("");
    try {
      await api(`/admin/orders/${id}/status`, { method: "PATCH", scope: "admin", body: { status } });
      toast(`Order marked as ${status}. The customer was emailed.`);
      setConfirm(null);
      reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? (e.field("status") ?? e.message) : "Could not update the order.");
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LoadState loading={loading && !data} error={error}>
      {data && (
        <>
          <PageHeader
            title={data.order_number}
            description={`Placed ${dateTime(data.created_at)}`}
            actions={
              <>
                <StatusBadge status={data.status} />
                <Link href="/admin/orders" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
                  ← All orders
                </Link>
              </>
            }
          />

          {actionError && (
            <div className="mb-4">
              <Alert>{actionError}</Alert>
            </div>
          )}

          {can("orders.update_status") && data.allowed_next_statuses.length > 0 && (
            <Card className="mb-6">
              <h2 className="mb-3 font-semibold">Update status</h2>
              <div className="flex flex-wrap gap-2">
                {data.allowed_next_statuses.map((status) => (
                  <Button
                    key={status}
                    shape="rounded"
                    variant={status === "cancelled" ? "danger" : "primary"}
                    onClick={() => (status === "cancelled" ? setConfirm(status) : change(status))}
                    loading={busy && confirm === null}
                  >
                    {actionLabel[status] ?? titleCase(status)}
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-xs text-neutral-500">The customer receives an email for every change.</p>
            </Card>
          )}

          <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
            <div className="space-y-6">
              <Table head={["Item", "SKU", "Price", "Qty", "Total"]}>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <Td className="font-medium">{item.product_name}</Td>
                    <Td className="text-neutral-500">{item.sku}</Td>
                    <Td>{money(item.unit_price)}</Td>
                    <Td>{item.quantity}</Td>
                    <Td className="font-medium">{money(item.line_total)}</Td>
                  </tr>
                ))}
              </Table>

              <Card>
                <h2 className="mb-3 font-semibold">Payments</h2>
                {data.payments.length === 0 ? (
                  <p className="text-sm text-neutral-500">No payment attempt yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.payments.map((payment, index) => (
                      <li key={index} className="flex flex-wrap justify-between gap-2">
                        <span>
                          {titleCase(payment.provider)} · {money(payment.amount)} {payment.currency.toUpperCase()}
                        </span>
                        <span className="text-neutral-500">
                          {titleCase(payment.status)}
                          {payment.failure_message ? ` (${payment.failure_message})` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <h2 className="mb-3 font-semibold">Customer</h2>
                <p className="text-sm font-medium">{data.customer?.name}</p>
                <p className="text-sm text-neutral-500">{data.customer?.email}</p>
                {can("customers.view") && data.customer && (
                  <Link href={`/admin/customers/${data.customer.id}`} className="mt-2 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400">
                    View customer →
                  </Link>
                )}
              </Card>

              <Card>
                <h2 className="mb-3 font-semibold">Shipping address</h2>
                <address className="text-sm not-italic leading-6 text-neutral-600 dark:text-neutral-300">
                  {data.shipping_address.name}
                  <br />
                  {data.shipping_address.address_line1}
                  {data.shipping_address.address_line2 && (
                    <>
                      <br />
                      {data.shipping_address.address_line2}
                    </>
                  )}
                  <br />
                  {data.shipping_address.city}
                  {data.shipping_address.state ? `, ${data.shipping_address.state}` : ""} {data.shipping_address.postal_code}
                  <br />
                  {data.shipping_address.country}
                  <br />
                  {data.shipping_address.phone}
                </address>
              </Card>

              <Card>
                <h2 className="mb-3 font-semibold">Summary</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Subtotal</dt>
                    <dd>{money(data.subtotal)}</dd>
                  </div>
                  {Number(data.discount_total) > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-neutral-500">Discount{data.coupon_code ? ` (${data.coupon_code})` : ""}</dt>
                      <dd>-{money(data.discount_total)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">Shipping</dt>
                    <dd>{money(data.shipping_total)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-neutral-200 pt-2 font-bold dark:border-neutral-800">
                    <dt>Total</dt>
                    <dd>{money(data.total)}</dd>
                  </div>
                </dl>
              </Card>
            </div>
          </div>

          {confirm && (
            <ConfirmDialog
              title="Cancel this order?"
              message="A paid order is refunded to the customer's card and its stock is put back. This cannot be undone."
              confirmLabel="Cancel order"
              busy={busy}
              onConfirm={() => change(confirm)}
              onClose={() => setConfirm(null)}
            />
          )}
        </>
      )}
    </LoadState>
  );
}

export default function OrderDetailPage() {
  return (
    <RequirePermission permission="orders.view">
      <OrderView />
    </RequirePermission>
  );
}
