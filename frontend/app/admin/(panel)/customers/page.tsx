"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyRow, LoadState, PageHeader, Pager, RequirePermission, Table, Td } from "@/components/admin/parts";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { Input } from "@/components/ui";
import { date, money } from "@/lib/format";
import type { AdminCustomer } from "@/lib/types";

function CustomerList() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, meta, loading, error } = useAdminQuery<AdminCustomer[]>("/admin/customers", { q: search, page });

  return (
    <>
      <PageHeader title="Customers" description="People who registered in your store." />
      <form
        className="mb-4 max-w-sm"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(q.trim());
          setPage(1);
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone" aria-label="Search customers" maxLength={100} className="!rounded-lg" />
      </form>

      <LoadState loading={loading && !data} error={error}>
        <Table head={["Customer", "Phone", "Orders", "Total spent", "Joined"]}>
          {data?.length === 0 ? (
            <EmptyRow colSpan={5}>No customers found.</EmptyRow>
          ) : (
            data?.map((customer) => (
              <tr key={customer.id} className={loading ? "opacity-60" : ""}>
                <Td>
                  <Link href={`/admin/customers/${customer.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                    {customer.name}
                  </Link>
                  <p className="text-xs text-neutral-500">{customer.email}</p>
                </Td>
                <Td>{customer.phone ?? "-"}</Td>
                <Td>{customer.orders_count}</Td>
                <Td className="font-medium">{money(customer.total_spent)}</Td>
                <Td>{date(customer.joined_at)}</Td>
              </tr>
            ))
          )}
        </Table>
        <Pager meta={meta} onPage={setPage} />
      </LoadState>
    </>
  );
}

export default function CustomersPage() {
  return (
    <RequirePermission permission="customers.view">
      <CustomerList />
    </RequirePermission>
  );
}
