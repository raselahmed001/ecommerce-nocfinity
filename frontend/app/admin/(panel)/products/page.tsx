"use client";

import Link from "next/link";
import { useState } from "react";
import { Can, ConfirmDialog, EmptyRow, LoadState, PageHeader, Pager, RequirePermission, Table, Td } from "@/components/admin/parts";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import { useToast } from "@/components/providers/Toast";
import { Img } from "@/components/store/Img";
import { Badge, ButtonLink, Input, Select } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { money } from "@/lib/format";
import type { AdminCategory, AdminProduct } from "@/lib/types";

function ProductList() {
  const { can } = useAdminAuth();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [stock, setStock] = useState("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, meta, loading, error, reload } = useAdminQuery<AdminProduct[]>("/admin/products", { q: search, category_id: category, status, stock, page });
  const categories = useAdminQuery<AdminCategory[]>("/admin/categories");

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/admin/products/${toDelete.id}`, { method: "DELETE", scope: "admin" });
      toast("Product deleted.");
      setToDelete(null);
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not delete the product.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const change = (setter: (v: string) => void) => (event: { target: { value: string } }) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage your catalog, prices and stock."
        actions={
          <Can permission="products.create">
            <ButtonLink href="/admin/products/new" shape="rounded">
              + New product
            </ButtonLink>
          </Can>
        }
      />

      <form
        className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_10rem_10rem]"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(q.trim());
          setPage(1);
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU, then press Enter" aria-label="Search products" maxLength={100} className="!rounded-lg" />
        <Select value={category} onChange={change(setCategory)} aria-label="Filter by category" className="!rounded-lg">
          <option value="">All categories</option>
          {categories.data?.map((parent) => (
            <optgroup key={parent.id} label={parent.name}>
              <option value={parent.id}>All {parent.name}</option>
              {parent.children?.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <Select value={status} onChange={change(setStatus)} aria-label="Filter by status" className="!rounded-lg">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Select value={stock} onChange={change(setStock)} aria-label="Filter by stock" className="!rounded-lg">
          <option value="">Any stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </Select>
      </form>

      <LoadState loading={loading && !data} error={error}>
        <Table head={["Product", "SKU", "Category", "Price", "Stock", "Status", ""]}>
          {data?.length === 0 ? (
            <EmptyRow colSpan={7}>No products match your filters.</EmptyRow>
          ) : (
            data?.map((product) => (
              <tr key={product.id} className={loading ? "opacity-60" : ""}>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      <Img src={product.image} alt="" sizes="44px" />
                    </div>
                    <span className="max-w-56 truncate font-medium">{product.name}</span>
                  </div>
                </Td>
                <Td className="text-neutral-500">{product.sku}</Td>
                <Td>{product.category?.name}</Td>
                <Td>
                  {product.discount_price ? (
                    <>
                      <span className="font-medium">{money(product.discount_price)}</span>{" "}
                      <span className="text-xs text-neutral-400 line-through">{money(product.price)}</span>
                    </>
                  ) : (
                    money(product.price)
                  )}
                </Td>
                <Td>
                  {product.stock === 0 ? <Badge tone="red">Out of stock</Badge> : product.is_low_stock ? <Badge tone="amber">{product.stock} (low)</Badge> : product.stock}
                </Td>
                <Td>{product.is_active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-3 text-sm">
                    {can("products.edit") && (
                      <Link href={`/admin/products/${product.id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                        Edit
                      </Link>
                    )}
                    {can("products.delete") && (
                      <button type="button" onClick={() => setToDelete(product)} className="text-red-600 hover:underline">
                        Delete
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))
          )}
        </Table>
        <Pager meta={meta} onPage={setPage} />
      </LoadState>

      {toDelete && (
        <ConfirmDialog
          title="Delete product"
          message={
            <>
              Delete <strong>{toDelete.name}</strong>? It disappears from the store. Past orders keep their details.
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

export default function ProductsPage() {
  return (
    <RequirePermission permission="products.view">
      <ProductList />
    </RequirePermission>
  );
}
