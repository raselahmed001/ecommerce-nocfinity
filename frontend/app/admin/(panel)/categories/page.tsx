"use client";

import { useState } from "react";
import { Can, ConfirmDialog, EmptyRow, LoadState, Modal, PageHeader, Pager, RequirePermission, Table, Td } from "@/components/admin/parts";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { useToast } from "@/components/providers/Toast";
import { Alert, Badge, Button, Field, Input, Select } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import type { AdminCategory } from "@/lib/types";
import { clean, isValid, required, type Errors } from "@/lib/validation";

interface FormState {
  id?: number;
  name: string;
  parent_id: string;
  is_active: boolean;
  sort_order: string;
}

function CategoryForm({ initial, parents, onDone, onClose }: { initial: FormState; parents: AdminCategory[]; onDone: () => void; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = clean({
      name: required(form.name, "Name", 2),
      sort_order: !/^\d+$/.test(form.sort_order) ? "Use a whole number, 0 or more." : undefined,
    });
    setErrors(found);
    setServerError("");
    if (!isValid(found)) return;

    setBusy(true);
    try {
      const body = { name: form.name.trim(), parent_id: form.parent_id ? Number(form.parent_id) : null, is_active: form.is_active, sort_order: Number(form.sort_order) };
      await api(form.id ? `/admin/categories/${form.id}` : "/admin/categories", { method: form.id ? "PUT" : "POST", scope: "admin", body });
      toast(form.id ? "Category updated." : "Category created.");
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

  return (
    <Modal title={form.id ? "Edit category" : "New category"} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {serverError && <Alert>{serverError}</Alert>}
        <Field label="Name" htmlFor="cat-name" error={errors.name}>
          <Input id="cat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} maxLength={100} className="!rounded-lg" />
        </Field>
        <Field label="Parent category" htmlFor="cat-parent" error={errors.parent_id} hint="Leave empty for a top-level category. Categories have two levels.">
          <Select id="cat-parent" value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} invalid={!!errors.parent_id} className="!rounded-lg">
            <option value="">None (top level)</option>
            {parents.filter((p) => p.id !== form.id).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sort order" htmlFor="cat-sort" error={errors.sort_order}>
          <Input id="cat-sort" type="number" min="0" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} invalid={!!errors.sort_order} className="!rounded-lg" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4" />
          Active (shown in the store)
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

function CategoryList() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  // One page of top-level categories for the table, and the whole tree for the "Parent category" dropdown.
  const { data, meta, loading, error, reload: reloadPage } = useAdminQuery<AdminCategory[]>("/admin/categories", { page, per_page: 10 });
  const all = useAdminQuery<AdminCategory[]>("/admin/categories");
  const reload = () => {
    reloadPage();
    all.reload();
  };
  const [editing, setEditing] = useState<FormState | null>(null);
  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const manage = can("categories.manage");

  const open = (category?: AdminCategory) =>
    setEditing(
      category
        ? { id: category.id, name: category.name, parent_id: category.parent_id ? String(category.parent_id) : "", is_active: category.is_active, sort_order: String(category.sort_order) }
        : { name: "", parent_id: "", is_active: true, sort_order: "0" },
    );

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/admin/categories/${toDelete.id}`, { method: "DELETE", scope: "admin" });
      toast("Category deleted.");
      setToDelete(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not delete the category.", "error");
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // Flatten the two levels into rows
  const rows = (data ?? []).flatMap((parent) => [{ category: parent, depth: 0 }, ...(parent.children ?? []).map((child) => ({ category: child, depth: 1 }))]);

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organise products into categories and sub-categories."
        actions={
          <Can permission="categories.manage">
            <Button shape="rounded" onClick={() => open()}>
              + New category
            </Button>
          </Can>
        }
      />

      <LoadState loading={loading && !data} error={error}>
        <Table head={["Name", "Slug", "Products", "Status", ""]}>
          {rows.length === 0 ? (
            <EmptyRow colSpan={5}>No categories yet.</EmptyRow>
          ) : (
            rows.map(({ category, depth }) => (
              <tr key={category.id}>
                <Td>
                  <span className={depth ? "ml-6 text-neutral-700 dark:text-neutral-300" : "font-medium"}>
                    {depth ? "↳ " : ""}
                    {category.name}
                  </span>
                </Td>
                <Td className="text-neutral-500">{category.slug}</Td>
                <Td>{category.products_count}</Td>
                <Td>{category.is_active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                <Td className="text-right">
                  {manage && (
                    <div className="flex justify-end gap-3 text-sm">
                      <button type="button" onClick={() => open(category)} className="text-indigo-600 hover:underline dark:text-indigo-400">
                        Edit
                      </button>
                      <button type="button" onClick={() => setToDelete(category)} className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </div>
                  )}
                </Td>
              </tr>
            ))
          )}
        </Table>
        <Pager meta={meta} onPage={setPage} />
      </LoadState>

      {editing && (
        <CategoryForm
          initial={editing}
          parents={all.data ?? []}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Delete category"
          message={
            <>
              Delete <strong>{toDelete.name}</strong>? A category that still has products or sub-categories cannot be deleted.
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

export default function CategoriesPage() {
  return (
    <RequirePermission permission="products.view">
      <CategoryList />
    </RequirePermission>
  );
}
