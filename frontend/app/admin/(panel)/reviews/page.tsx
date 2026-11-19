"use client";

import { useState } from "react";
import { ConfirmDialog, EmptyRow, LoadState, PageHeader, Pager, RequirePermission, Table, Td } from "@/components/admin/parts";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { useToast } from "@/components/providers/Toast";
import { Button, Input } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { date } from "@/lib/format";
import type { AdminReview } from "@/lib/types";

function ReviewList() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<AdminReview | null>(null);
  const { data, meta, loading, error, reload } = useAdminQuery<AdminReview[]>("/admin/reviews", { q: search, page });

  const remove = async () => {
    if (!target) return;
    try {
      await api(`/admin/reviews/${target.id}`, { method: "DELETE", scope: "admin" });
      toast("Review deleted.");
      setTarget(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not delete the review.");
    }
  };

  return (
    <>
      <PageHeader title="Reviews" description="Customer reviews. Remove the ones that break your rules." />
      <form
        className="mb-4 max-w-sm"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(q.trim());
          setPage(1);
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product, customer or text" aria-label="Search reviews" maxLength={100} className="!rounded-lg" />
      </form>

      <LoadState loading={loading && !data} error={error}>
        <Table head={["Product", "Customer", "Rating", "Review", "Date", ""]}>
          {data?.length === 0 ? (
            <EmptyRow colSpan={6}>No reviews found.</EmptyRow>
          ) : (
            data?.map((review) => (
              <tr key={review.id} className={loading ? "opacity-60" : ""}>
                <Td className="font-medium">{review.product?.name}</Td>
                <Td>
                  {review.customer?.name}
                  <p className="text-xs text-neutral-500">{review.customer?.email}</p>
                </Td>
                <Td>{review.rating} / 5</Td>
                <Td className="max-w-xs">
                  {review.title && <p className="font-medium">{review.title}</p>}
                  <p className="line-clamp-2 text-neutral-600 dark:text-neutral-400">{review.body}</p>
                </Td>
                <Td>{date(review.created_at)}</Td>
                <Td>
                  <Button type="button" variant="outline" size="sm" shape="rounded" onClick={() => setTarget(review)}>
                    Delete
                  </Button>
                </Td>
              </tr>
            ))
          )}
        </Table>
        <Pager meta={meta} onPage={setPage} />
      </LoadState>

      {target && (
        <ConfirmDialog
          title="Delete this review?"
          message={`The review by ${target.customer?.name ?? "this customer"} will be removed and the product rating recalculated.`}
          confirmLabel="Delete"
          onConfirm={remove}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}

export default function ReviewsPage() {
  return (
    <RequirePermission permission="reviews.manage">
      <ReviewList />
    </RequirePermission>
  );
}
