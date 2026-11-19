"use client";

import { useState } from "react";
import { ConfirmDialog, EmptyRow, LoadState, Modal, PageHeader, Pager, RequirePermission, Table, Td } from "@/components/admin/parts";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { useToast } from "@/components/providers/Toast";
import { Alert, Badge, Button, Field, Input, Select } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { date, money } from "@/lib/format";
import type { AdminCoupon } from "@/lib/types";
import { clean, isValid, type Errors } from "@/lib/validation";

interface FormState {
  id?: number;
  code: string;
  type: "percentage" | "fixed";
  value: string;
  min_order_amount: string;
  usage_limit: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
}

/** The API sends ISO dates; <input type="date"> wants YYYY-MM-DD. */
const toDateInput = (value: string | null) => (value ? value.slice(0, 10) : "");

function CouponForm({ initial, onDone, onClose }: { initial: FormState; onDone: () => void; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof FormState) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(form.value);
    const found = clean({
      code: !/^[A-Za-z0-9_-]{3,50}$/.test(form.code) ? "Use 3-50 letters, numbers, - or _." : undefined,
      value: !(value > 0) ? "Enter a value above 0." : form.type === "percentage" && value > 100 ? "A percentage cannot be above 100." : undefined,
      min_order_amount: form.min_order_amount !== "" && Number(form.min_order_amount) < 0 ? "Cannot be negative." : undefined,
      usage_limit: form.usage_limit !== "" && !/^[1-9]\d*$/.test(form.usage_limit) ? "Use a whole number of 1 or more." : undefined,
      expires_at: form.starts_at && form.expires_at && form.expires_at <= form.starts_at ? "Expiry must be after the start date." : undefined,
    });
    setErrors(found);
    setServerError("");
    if (!isValid(found)) return;

    setBusy(true);
    try {
      await api(form.id ? `/admin/coupons/${form.id}` : "/admin/coupons", {
        method: form.id ? "PUT" : "POST",
        scope: "admin",
        body: {
          code: form.code.trim().toUpperCase(),
          type: form.type,
          value: form.value,
          min_order_amount: form.min_order_amount === "" ? 0 : form.min_order_amount,
          usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit),
          starts_at: form.starts_at || null,
          expires_at: form.expires_at || null,
          is_active: form.is_active,
        },
      });
      toast(form.id ? "Coupon updated." : "Coupon created.");
      onDone();
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])));
        if (Object.keys(e.errors).length === 0) setServerError(e.message);
      } else setServerError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const r = "!rounded-lg";

  return (
    <Modal title={form.id ? "Edit coupon" : "New coupon"} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="space-y-4">
        {serverError && <Alert>{serverError}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" htmlFor="c-code" error={errors.code}>
            <Input id="c-code" value={form.code} onChange={set("code")} invalid={!!errors.code} maxLength={50} className={`${r} uppercase`} />
          </Field>
          <Field label="Type" htmlFor="c-type" error={errors.type}>
            <Select id="c-type" value={form.type} onChange={set("type")} className={r}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed amount ($)</option>
            </Select>
          </Field>
          <Field label={form.type === "percentage" ? "Value (%)" : "Value ($)"} htmlFor="c-value" error={errors.value}>
            <Input id="c-value" type="number" step="0.01" min="0" value={form.value} onChange={set("value")} invalid={!!errors.value} className={r} />
          </Field>
          <Field label="Minimum order amount ($)" htmlFor="c-min" error={errors.min_order_amount}>
            <Input id="c-min" type="number" step="0.01" min="0" value={form.min_order_amount} onChange={set("min_order_amount")} invalid={!!errors.min_order_amount} className={r} />
          </Field>
          <Field label="Usage limit (empty = unlimited)" htmlFor="c-limit" error={errors.usage_limit}>
            <Input id="c-limit" type="number" min="1" step="1" value={form.usage_limit} onChange={set("usage_limit")} invalid={!!errors.usage_limit} className={r} />
          </Field>
          <div />
          <Field label="Valid from" htmlFor="c-start" error={errors.starts_at}>
            <Input id="c-start" type="date" value={form.starts_at} onChange={set("starts_at")} invalid={!!errors.starts_at} className={r} />
          </Field>
          <Field label="Valid until" htmlFor="c-end" error={errors.expires_at}>
            <Input id="c-end" type="date" value={form.expires_at} onChange={set("expires_at")} invalid={!!errors.expires_at} className={r} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4" />
          Active
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" shape="rounded" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" shape="rounded" loading={busy}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CouponList() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useAdminQuery<AdminCoupon[]>("/admin/coupons", { page });
  const [editing, setEditing] = useState<FormState | null>(null);
  const [toDelete, setToDelete] = useState<AdminCoupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const open = (coupon?: AdminCoupon) =>
    setEditing(
      coupon
        ? {
            id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, min_order_amount: coupon.min_order_amount,
            usage_limit: coupon.usage_limit === null ? "" : String(coupon.usage_limit),
            starts_at: toDateInput(coupon.starts_at), expires_at: toDateInput(coupon.expires_at), is_active: coupon.is_active,
          }
        : { code: "", type: "percentage", value: "", min_order_amount: "0", usage_limit: "", starts_at: "", expires_at: "", is_active: true },
    );

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/admin/coupons/${toDelete.id}`, { method: "DELETE", scope: "admin" });
      toast("Coupon deleted.");
      setToDelete(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not delete the coupon.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Discount codes customers can use in their cart."
        actions={
          <Button shape="rounded" onClick={() => open()}>
            + New coupon
          </Button>
        }
      />

      <LoadState loading={loading && !data} error={error}>
        <Table head={["Code", "Discount", "Min. order", "Used", "Valid", "Status", ""]}>
          {data?.length === 0 ? (
            <EmptyRow colSpan={7}>No coupons yet.</EmptyRow>
          ) : (
            data?.map((coupon) => (
              <tr key={coupon.id}>
                <Td className="font-mono font-medium">{coupon.code}</Td>
                <Td>{coupon.type === "percentage" ? `${Number(coupon.value)}%` : money(coupon.value)}</Td>
                <Td>{Number(coupon.min_order_amount) > 0 ? money(coupon.min_order_amount) : "-"}</Td>
                <Td>
                  {coupon.used_count}
                  {coupon.usage_limit !== null ? ` / ${coupon.usage_limit}` : ""}
                </Td>
                <Td className="text-xs text-neutral-500">
                  {date(coupon.starts_at)} → {coupon.expires_at ? date(coupon.expires_at) : "no end"}
                </Td>
                <Td>{coupon.is_expired ? <Badge tone="red">Expired</Badge> : coupon.is_active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-3 text-sm">
                    <button type="button" onClick={() => open(coupon)} className="text-indigo-600 hover:underline dark:text-indigo-400">
                      Edit
                    </button>
                    <button type="button" onClick={() => setToDelete(coupon)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </div>
                </Td>
              </tr>
            ))
          )}
        </Table>
        <Pager meta={meta} onPage={setPage} />
      </LoadState>

      {editing && (
        <CouponForm
          initial={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Delete coupon"
          message={
            <>
              Delete <strong>{toDelete.code}</strong>? Past orders keep the code they used.
            </>
          }
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}

export default function CouponsPage() {
  return (
    <RequirePermission permission="coupons.manage">
      <CouponList />
    </RequirePermission>
  );
}
