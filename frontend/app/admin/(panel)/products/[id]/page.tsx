"use client";

import { useParams } from "next/navigation";
import { LoadState, PageHeader, RequirePermission } from "@/components/admin/parts";
import { ProductForm } from "@/components/admin/ProductForm";
import { useAdminQuery } from "@/components/admin/useAdminQuery";
import type { AdminProduct } from "@/lib/types";

function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useAdminQuery<AdminProduct>(`/admin/products/${encodeURIComponent(id)}`);

  return (
    <LoadState loading={loading} error={error}>
      {data && (
        <>
          <PageHeader title="Edit product" description={data.name} />
          <ProductForm product={data} />
        </>
      )}
    </LoadState>
  );
}

export default function EditProductPage() {
  return (
    <RequirePermission permission="products.edit">
      <EditProduct />
    </RequirePermission>
  );
}
