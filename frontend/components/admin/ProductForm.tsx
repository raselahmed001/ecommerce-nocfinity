"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, api } from "@/lib/api";
import type { AdminCategory, AdminProduct, SiteContent } from "@/lib/types";
import { clean, isValid, required, type Errors } from "@/lib/validation";
import { useToast } from "../providers/Toast";
import { Img } from "../store/Img";
import { Alert, Button, Field, Input, Select, Textarea } from "../ui";
import { Card } from "./parts";
import { useAdminQuery } from "./useAdminQuery";

const MAX_IMAGES = 8;
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/** Quick browser-side check. The API checks the real file content again. */
function imageProblem(files: File[], existing: number): string | undefined {
  if (existing + files.length > MAX_IMAGES) return `A product can have at most ${MAX_IMAGES} images.`;
  for (const file of files) {
    if (!ALLOWED.includes(file.type)) return `${file.name} is not a JPG, PNG or WebP image.`;
    if (file.size > MAX_BYTES) return `${file.name} is larger than 2 MB.`;
  }
}

function ImagePicker({ files, onChange, existing = 0, disabled }: { files: File[]; onChange: (files: File[]) => void; existing?: number; disabled?: boolean }) {
  const [error, setError] = useState("");
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  return (
    <div>
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        aria-label="Add images"
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          const all = [...files, ...picked];
          const problem = imageProblem(all, existing);
          setError(problem ?? "");
          if (!problem) onChange(all);
          event.target.value = "";
        }}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white dark:file:bg-white dark:file:text-black"
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
      {previews.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3">
          {previews.map((url, index) => (
            <li key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={url} alt={files[index].name} className="h-20 w-20 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                aria-label={`Remove ${files[index].name}`}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProductForm({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const toast = useToast();
  const categories = useAdminQuery<AdminCategory[]>("/admin/categories");
  const options = useAdminQuery<SiteContent>("/site"); // the size and color lists of the storefront filters
  const [current, setCurrent] = useState<AdminProduct | undefined>(product);
  const [form, setForm] = useState({
    category_id: String(product?.category?.id ?? ""),
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    description: product?.description ?? "",
    price: product?.price ?? "",
    discount_price: product?.discount_price ?? "",
    stock: String(product?.stock ?? 0),
    low_stock_threshold: String(product?.low_stock_threshold ?? 5),
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
    rating: product?.rating ?? "",
  });
  const [sizes, setSizes] = useState<string[]>(product?.sizes ?? []);
  const [colors, setColors] = useState<string[]>(product?.colors ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);

  const text = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm({ ...form, [key]: event.target.value });

  const validate = () => {
    const price = Number(form.price);
    const discount = form.discount_price === "" ? null : Number(form.discount_price);
    return clean({
      category_id: form.category_id ? undefined : "Choose a category.",
      name: required(form.name, "Name", 2),
      sku: !/^[A-Za-z0-9_-]+$/.test(form.sku) ? "SKU may contain letters, numbers, - and _ only." : undefined,
      price: !(price >= 0.01) ? "Enter a price of at least 0.01." : undefined,
      discount_price: discount !== null && !(discount > 0 && discount < price) ? "Discount price must be above 0 and below the price." : undefined,
      stock: !/^\d+$/.test(form.stock) ? "Stock must be a whole number, 0 or more." : undefined,
      low_stock_threshold: !/^\d+$/.test(form.low_stock_threshold) ? "Use a whole number, 0 or more." : undefined,
      rating: form.rating !== "" && !(Number(form.rating) >= 0 && Number(form.rating) <= 5) ? "Rating must be between 0 and 5." : undefined,
    });
  };

  const apply = (e: unknown) => {
    if (e instanceof ApiError) {
      setErrors(Object.fromEntries(Object.entries(e.errors).map(([key, messages]) => [key.startsWith("images") ? "images" : key, messages[0]])));
      setServerError(Object.keys(e.errors).length ? "Please fix the highlighted fields." : e.message);
    } else {
      setServerError("Something went wrong. Please try again.");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setServerError("");
    if (!isValid(found)) return;

    const payload = {
      category_id: Number(form.category_id),
      name: form.name.trim(),
      sku: form.sku.trim(),
      description: form.description.trim() || null,
      price: form.price,
      discount_price: form.discount_price === "" ? null : form.discount_price,
      stock: Number(form.stock),
      low_stock_threshold: Number(form.low_stock_threshold),
      is_active: form.is_active,
      is_featured: form.is_featured,
      sizes,
      colors,
      rating: form.rating === "" ? null : form.rating,
    };

    setBusy(true);
    try {
      if (current) {
        const res = await api<AdminProduct>(`/admin/products/${current.id}`, { method: "PUT", scope: "admin", body: payload });
        setCurrent(res.data);
        toast("Product saved.");
      } else {
        // Creating can include images, so it is sent as multipart form data.
        const data = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value === null) return;
          if (Array.isArray(value)) return value.forEach((item) => data.append(`${key}[]`, item));
          data.append(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
        });
        files.forEach((file) => data.append("images[]", file));
        await api("/admin/products", { method: "POST", scope: "admin", body: data });
        toast("Product created.");
        router.push("/admin/products");
      }
    } catch (e) {
      apply(e);
    } finally {
      setBusy(false);
    }
  };

  // ---- image management on an existing product ----
  const imageAction = async (action: () => Promise<{ data: AdminProduct }>, message: string) => {
    setImageBusy(true);
    setServerError("");
    try {
      setCurrent((await action()).data);
      toast(message);
    } catch (e) {
      apply(e);
    } finally {
      setImageBusy(false);
    }
  };

  const upload = () => {
    if (!current || files.length === 0) return;
    const data = new FormData();
    files.forEach((file) => data.append("images[]", file));
    void imageAction(() => api<AdminProduct>(`/admin/products/${current.id}/images`, { method: "POST", scope: "admin", body: data }), "Images uploaded.").then(() => setFiles([]));
  };

  const box = (key: "is_active" | "is_featured", label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4 rounded" />
      {label}
    </label>
  );

  const toggle = (list: string[], set: (next: string[]) => void, name: string) =>
    set(list.includes(name) ? list.filter((item) => item !== name) : [...list, name]);

  const r = "!rounded-lg";

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {serverError && <Alert>{serverError}</Alert>}
        <Card className="space-y-4">
          <Field label="Name" htmlFor="name" error={errors.name}>
            <Input id="name" value={form.name} onChange={text("name")} invalid={!!errors.name} maxLength={255} className={r} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU" htmlFor="sku" error={errors.sku}>
              <Input id="sku" value={form.sku} onChange={text("sku")} invalid={!!errors.sku} maxLength={100} className={r} />
            </Field>
            <Field label="Category" htmlFor="category_id" error={errors.category_id}>
              <Select id="category_id" value={form.category_id} onChange={text("category_id")} invalid={!!errors.category_id} className={r}>
                <option value="">Select a category</option>
                {categories.data?.map((parent) => (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>{parent.name}</option>
                    {parent.children?.map((child) => (
                      <option key={child.id} value={child.id}>
                        {parent.name} › {child.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Description" htmlFor="description" error={errors.description} hint="Plain text only. HTML tags are removed.">
            <Textarea id="description" value={form.description} onChange={text("description")} invalid={!!errors.description} maxLength={5000} className={r} />
          </Field>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Pricing and stock</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price ($)" htmlFor="price" error={errors.price}>
              <Input id="price" type="number" step="0.01" min="0" inputMode="decimal" value={form.price} onChange={text("price")} invalid={!!errors.price} className={r} />
            </Field>
            <Field label="Discount price ($, optional)" htmlFor="discount_price" error={errors.discount_price}>
              <Input id="discount_price" type="number" step="0.01" min="0" inputMode="decimal" value={form.discount_price} onChange={text("discount_price")} invalid={!!errors.discount_price} className={r} />
            </Field>
            <Field label="Stock" htmlFor="stock" error={errors.stock}>
              <Input id="stock" type="number" min="0" step="1" value={form.stock} onChange={text("stock")} invalid={!!errors.stock} className={r} />
            </Field>
            <Field label="Low stock alert at" htmlFor="low_stock_threshold" error={errors.low_stock_threshold}>
              <Input id="low_stock_threshold" type="number" min="0" step="1" value={form.low_stock_threshold} onChange={text("low_stock_threshold")} invalid={!!errors.low_stock_threshold} className={r} />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">Sizes, colors and rating</h2>
          <p className="mb-4 text-sm text-neutral-500">Shoppers pick from these on the product page. Leave both empty for a product without options.</p>

          <p className="mb-2 text-sm font-medium">Sizes</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sizes">
            {(options.data?.filters.sizes ?? []).map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={sizes.includes(name)}
                onClick={() => toggle(sizes, setSizes, name)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  sizes.includes(name) ? "border-indigo-600 bg-indigo-600 text-white" : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <p className="mb-2 mt-5 text-sm font-medium">Colors</p>
          <div className="flex flex-wrap gap-3" role="group" aria-label="Colors">
            {(options.data?.filters.colors ?? []).map(({ name, hex }) => (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={name}
                aria-pressed={colors.includes(name)}
                onClick={() => toggle(colors, setColors, name)}
                className={`flex h-9 w-9 items-center justify-center rounded-full border ${colors.includes(name) ? "ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-neutral-900" : "border-neutral-300"}`}
                style={{ backgroundColor: hex }}
              >
                {colors.includes(name) && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={name === "White" || name === "Yellow" ? "#000" : "#fff"} strokeWidth="3" aria-hidden>
                    <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <div className="mt-5 max-w-40">
            <Field label="Rating (0 to 5, optional)" htmlFor="rating" error={errors.rating}>
              <Input id="rating" type="number" min="0" max="5" step="0.1" value={form.rating} onChange={text("rating")} invalid={!!errors.rating} className={r} />
            </Field>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="space-y-3">
          <h2 className="font-semibold">Visibility</h2>
          {box("is_active", "Active (shown in the store)")}
          {box("is_featured", "Featured on the home page")}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Images</h2>

          {current && (current.images?.length ?? 0) > 0 && (
            <ul className="mb-4 grid grid-cols-3 gap-3">
              {current.images?.map((image) => (
                <li key={image.id} className="space-y-1">
                  <div className={`relative aspect-square overflow-hidden rounded-lg bg-neutral-100 ${image.is_primary ? "ring-2 ring-indigo-500" : ""}`}>
                    <Img src={image.url} alt="" sizes="100px" />
                  </div>
                  <div className="flex justify-between text-[11px]">
                    {image.is_primary ? (
                      <span className="font-medium text-indigo-600">Primary</span>
                    ) : (
                      <button type="button" disabled={imageBusy} className="text-indigo-600 hover:underline" onClick={() => imageAction(() => api<AdminProduct>(`/admin/products/${current.id}/images/${image.id}/primary`, { method: "PATCH", scope: "admin" }), "Primary image updated.")}>
                        Make primary
                      </button>
                    )}
                    <button type="button" disabled={imageBusy} className="text-red-600 hover:underline" onClick={() => imageAction(() => api<AdminProduct>(`/admin/products/${current.id}/images/${image.id}`, { method: "DELETE", scope: "admin" }), "Image deleted.")}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <ImagePicker files={files} onChange={setFiles} existing={current?.images?.length ?? 0} disabled={imageBusy} />
          {errors.images && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {errors.images}
            </p>
          )}
          {current && files.length > 0 && (
            <Button type="button" shape="rounded" size="sm" className="mt-3" loading={imageBusy} onClick={upload}>
              Upload {files.length} image{files.length > 1 ? "s" : ""}
            </Button>
          )}
          <p className="mt-2 text-xs text-neutral-500">JPG, PNG or WebP, up to 2 MB each, {MAX_IMAGES} images maximum. The first one is the main image.</p>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" shape="rounded" loading={busy} className="flex-1">
            {current ? "Save changes" : "Create product"}
          </Button>
          <Link href="/admin/products" className="inline-flex h-11 items-center rounded-lg border border-neutral-300 px-5 text-sm dark:border-neutral-700">
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
