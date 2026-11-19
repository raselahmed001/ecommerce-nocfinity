import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/store/Pagination";
import { ProductFilters } from "@/components/store/ProductFilters";
import { ProductGrid } from "@/components/store/ProductCard";
import { SortSelect } from "@/components/store/SortSelect";
import { getCategories, getProducts, getSite } from "@/lib/server-data";
import type { Category } from "@/lib/types";

export const metadata: Metadata = { title: "Shop" };

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function findCategory(categories: Category[], slug?: string): { current?: Category; parent?: Category } {
  for (const category of categories) {
    if (category.slug === slug) return { current: category };
    const child = category.children?.find((c) => c.slug === slug);
    if (child) return { current: child, parent: category };
  }
  return {};
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  // Only these filters are forwarded, and the API validates every one of them again.
  const params = {
    q: first(raw.q),
    category: first(raw.category),
    min_price: first(raw.min_price),
    max_price: first(raw.max_price),
    sort: first(raw.sort) ?? "popular",
    featured: first(raw.featured),
    on_sale: first(raw.on_sale),
    size: first(raw.size),
    color: first(raw.color),
    page: first(raw.page),
  };

  const [categories, result, site] = await Promise.all([getCategories(), getProducts({ ...params, per_page: 9 }), getSite()]);
  const { current, parent } = findCategory(categories, params.category);
  const title = params.q
    ? `Results for "${params.q}"`
    : params.featured
      ? "Top selling"
      : params.on_sale
        ? "On sale"
        : (current?.name ?? "All products");

  return (
    <div className="mx-auto max-w-7xl px-4 pb-4 pt-2 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-5 border-t border-black/10 pt-5 text-sm text-black/60">
        <Link href="/" className="hover:text-black">
          Home
        </Link>
        <span className="mx-2">&rsaquo;</span>
        {parent && (
          <>
            <Link href={`/products?category=${parent.slug}`} className="hover:text-black">
              {parent.name}
            </Link>
            <span className="mx-2">&rsaquo;</span>
          </>
        )}
        <span className="text-black">{current?.name ?? "Shop"}</span>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
        <div className="lg:contents">
          <div className="flex items-center justify-between lg:contents">
            <h1 className="text-3xl font-bold lg:hidden">{title}</h1>
            <ProductFilters categories={categories} options={site.filters} />
          </div>
        </div>

        <section className="min-w-0 flex-1" aria-labelledby="listing-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 id="listing-title" className="hidden text-3xl font-bold lg:block">
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 text-sm lg:ml-auto">
              {result.meta && (
                <span className="text-black/60">
                  Showing {result.meta.from ?? 0}-{result.meta.to ?? 0} of {result.meta.total} Products
                </span>
              )}
              <SortSelect />
            </div>
          </div>

          <div className="mt-5">
            {result.failed ? (
              <p className="rounded-2xl bg-surface p-8 text-center text-black/70">Products could not be loaded. Please try again shortly.</p>
            ) : result.products.length === 0 ? (
              <div className="rounded-2xl bg-surface p-10 text-center">
                <p className="text-lg font-bold">No products found</p>
                <p className="mt-1 text-sm text-black/60">Try removing a filter or searching for something else.</p>
                <Link href="/products" className="mt-4 inline-block text-sm underline">
                  Clear all filters
                </Link>
              </div>
            ) : (
              <ProductGrid products={result.products} columns={3} />
            )}
          </div>

          {result.meta && <Pagination meta={result.meta} basePath="/products" params={params} />}
        </section>
      </div>
    </div>
  );
}
