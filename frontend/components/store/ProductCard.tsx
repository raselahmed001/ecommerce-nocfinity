import Link from "next/link";
import type { ProductSummary } from "@/lib/types";
import { Img } from "./Img";
import { Price } from "./Price";
import { Stars } from "./Stars";

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-surface">
        <Img src={product.image} alt={product.name} className="transition duration-300 group-hover:scale-105" />
        {!product.in_stock && (
          <span className="absolute left-3 top-3 rounded-full bg-black px-3 py-1 text-xs font-medium text-white">Out of stock</span>
        )}
      </div>
      <h3 className="mt-3 line-clamp-1 text-base font-bold md:text-xl">{product.name}</h3>
      <div className="mt-1.5">
        <Stars rating={product.rating} />
      </div>
      <div className="mt-1.5">
        <Price price={product.price} discountPrice={product.discount_price} />
      </div>
    </Link>
  );
}

/** scrollOnMobile: on phones the cards sit in one swipeable row (like the home page design). */
export function ProductGrid({ products, columns = 4, scrollOnMobile = false }: { products: ProductSummary[]; columns?: 3 | 4; scrollOnMobile?: boolean }) {
  const mobile = scrollOnMobile
    ? "flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:overflow-visible"
    : "grid grid-cols-2 gap-x-4 gap-y-8";

  return (
    <div className={`${mobile} sm:grid-cols-2 sm:gap-x-5 sm:gap-y-8 ${columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
      {products.map((product) => (
        <div key={product.id} className={scrollOnMobile ? "w-[46%] shrink-0 snap-start sm:w-auto" : ""}>
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
