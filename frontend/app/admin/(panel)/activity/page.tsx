"use client";

import { useState } from "react";
import { EmptyRow, LoadState, PageHeader, Pager, RequirePermission, Table, Td } from "@/components/admin/parts";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { Input } from "@/components/ui";
import { Select } from "@/components/Select";
import { dateTime } from "@/lib/format";
import type { ActivityLog } from "@/lib/types";

const AREAS = [
  { value: "", label: "All activity" },
  { value: "auth", label: "Sign in and security" },
  { value: "product", label: "Products" },
  { value: "category", label: "Categories" },
  { value: "order", label: "Orders" },
  { value: "coupon", label: "Coupons" },
  { value: "role", label: "Roles" },
  { value: "review", label: "Reviews" },
];

function LogList() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const { data, meta, loading, error } = useAdminQuery<ActivityLog[]>("/admin/activity-logs", { q: search, action, page });

  return (
    <>
      <PageHeader title="Activity log" description="Who did what in the admin panel. Entries cannot be edited or deleted." />
      <div className="mb-4 flex flex-wrap gap-3">
        <form
          className="w-full max-w-sm"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(q.trim());
            setPage(1);
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff or description" aria-label="Search activity" maxLength={100} className="!rounded-lg" />
        </form>
        <Select
          aria-label="Filter by area"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          {AREAS.map((area) => (
            <option key={area.value} value={area.value}>
              {area.label}
            </option>
          ))}
        </Select>
      </div>

      <LoadState loading={loading && !data} error={error}>
        <Table head={["When", "Staff", "Activity", "IP address"]}>
          {data?.length === 0 ? (
            <EmptyRow colSpan={4}>No activity yet.</EmptyRow>
          ) : (
            data?.map((log) => (
              <tr key={log.id} className={loading ? "opacity-60" : ""}>
                <Td className="whitespace-nowrap">{dateTime(log.created_at)}</Td>
                <Td>{log.user?.name ?? "Deleted user"}</Td>
                <Td>
                  <p>{log.description}</p>
                  <p className="font-mono text-xs text-neutral-500">{log.action}</p>
                </Td>
                <Td className="font-mono text-xs">{log.ip_address ?? "-"}</Td>
              </tr>
            ))
          )}
        </Table>
        <Pager meta={meta} onPage={setPage} />
      </LoadState>
    </>
  );
}

export default function ActivityPage() {
  return (
    <RequirePermission permission="activity.view">
      <LogList />
    </RequirePermission>
  );
}
