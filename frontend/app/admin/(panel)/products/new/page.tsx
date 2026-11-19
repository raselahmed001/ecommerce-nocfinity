"use client";

import { PageHeader, RequirePermission } from "@/components/admin/parts";
import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <RequirePermission permission="products.create">
      <PageHeader title="New product" />
      <ProductForm />
    </RequirePermission>
  );
}
