"use client";

import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { Card, EmptyRow, LoadState, PageHeader, Table, Td } from "@/components/admin/parts";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { Alert, StatusBadge } from "@/components/ui";
import { date, money } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </Card>
  );
}

function DashboardView() {
  const { data, loading, error } = useAdminQuery<Dashboard>("/admin/dashboard");

  return (
    <LoadState loading={loading} error={error}>
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Today's orders" value={data.stats.todays_orders} hint="Paid orders placed today" />
            <StatCard label="Today's revenue" value={money(data.stats.todays_revenue)} />
            <StatCard label="Total customers" value={data.stats.total_customers} />
            <StatCard label="Low stock products" value={data.stats.low_stock_count} hint="At or below their alert level" />
          </div>

          <Card>
            <h2 className="mb-4 font-semibold">Sales, last 30 days</h2>
            <div className="h-72 w-full" role="img" aria-label="Line chart of daily revenue for the last 30 days">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.sales_chart.map((d) => ({ ...d, revenue: Number(d.revenue), label: d.date.slice(5) }))}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8884" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(value, name) => (name === "revenue" ? [money(Number(value)), "Revenue"] : [value, "Orders"])}
                    labelFormatter={(label) => `Day ${label}`}
                    contentStyle={{ borderRadius: 8 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#rev)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Recent orders</h2>
              <Link href="/admin/orders" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
                View all
              </Link>
            </div>
            <Table head={["Order", "Customer", "Date", "Status", "Total"]}>
              {data.recent_orders.length === 0 ? (
                <EmptyRow colSpan={5}>No orders yet.</EmptyRow>
              ) : (
                data.recent_orders.map((order) => (
                  <tr key={order.id}>
                    <Td>
                      <Link href={`/admin/orders/${order.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                        {order.order_number}
                      </Link>
                    </Td>
                    <Td>{order.customer?.name}</Td>
                    <Td>{date(order.created_at)}</Td>
                    <Td>
                      <StatusBadge status={order.status} />
                    </Td>
                    <Td className="font-medium">{money(order.total)}</Td>
                  </tr>
                ))
              )}
            </Table>
          </div>
        </div>
      )}
    </LoadState>
  );
}

export default function DashboardPage() {
  const { user, can } = useAdminAuth();

  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome back, ${user?.name.split(" ")[0] ?? ""}.`} />
      {can("reports.view") ? (
        <DashboardView />
      ) : (
        <Alert tone="info">Your role does not include reports. Use the menu to open the sections you can manage.</Alert>
      )}
    </>
  );
}
