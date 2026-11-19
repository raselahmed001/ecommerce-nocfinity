import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/store/AddToCart";
import { Gallery } from "@/components/store/Gallery";
import { Price } from "@/components/store/Price";
import { ProductGrid } from "@/components/store/ProductCard";
import { Stars } from "@/components/store/Stars";
import { ApiError, api } from "@/lib/api";
import { getSite } from "@/lib/server-data";
import type { ProductDetail, ProductSummary } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  try {
    return (await api<{ product: ProductDetail; related: ProductSummary[] }>(`/products/${encodeURIComponent(slug)}`)).data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { product } = await load(slug);
    return { title: product.name, description: (product.description ?? "").slice(0, 150) };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [{ product, related }, site] = await Promise.all([load(slug), getSite()]);
  const colorHex = Object.fromEntries(site.filters.colors.map((c) => [c.name, c.hex]));

  return (
    <div className="mx-auto max-w-7xl px-4 pt-2 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 border-t border-black/10 pt-5 text-sm text-black/60">
        <Link href="/" className="hover:text-black">
          Home
        </Link>
        <span className="mx-2">&rsaquo;</span>
        <Link href="/products" className="hover:text-black">
          Shop
        </Link>
        {product.category && (
          <>
            <span className="mx-2">&rsaquo;</span>
            <Link href={`/products?category=${product.category.slug}`} className="hover:text-black">
              {product.category.name}
            </Link>
          </>
        )}
        <span className="mx-2">&rsaquo;</span>
        <span className="text-black">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
        <Gallery images={product.images} name={product.name} />

        <div>
          <h1 className="display text-3xl leading-tight sm:text-4xl">
            {/* Words never break in the middle (e.g. "T-shirt"), so a long name wraps between words only. */}
            {product.name.split(" ").map((word, index) => (
              <span key={index} className="whitespace-nowrap">
                {index > 0 && " "}
                {word}
              </span>
            ))}
          </h1>
          <div className="mt-3">
            <Stars rating={product.rating} />
          </div>
          <div className="mt-3">
            <Price price={product.price} discountPrice={product.discount_price} size="lg" />
          </div>
          {/* Plain text: React escapes it, so HTML in a description can never run. */}
          <p className="mt-5 whitespace-pre-line text-sm text-black/60 sm:text-base">{product.description}</p>

          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
            <dt className="text-black/60">Availability</dt>
            <dd className={`font-medium ${product.in_stock ? "text-success" : "text-sale"}`}>{product.in_stock ? "In stock" : "Out of stock"}</dd>
            <dt className="text-black/60">SKU</dt>
            <dd>{product.sku}</dd>
          </dl>

          <div className="mt-6">
            <AddToCart product={product} colorHex={colorHex} />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related">
          <h2 id="related" className="display text-center text-3xl sm:text-5xl">
            You might also like
          </h2>
          <div className="mt-10">
            <ProductGrid products={related} scrollOnMobile />
          </div>
        </section>
      )}
    </div>
  );
}
