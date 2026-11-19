import Link from "next/link";
import { Img } from "@/components/store/Img";
import { ProductGrid } from "@/components/store/ProductCard";
import { Testimonials } from "@/components/store/Testimonials";
import { ButtonLink } from "@/components/ui";
import { getCategories, getProducts, getSite } from "@/lib/server-data";

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-[4.5rem]">
      <h2 className="display text-center text-3xl sm:text-5xl">{title}</h2>
      <div className="mt-8 sm:mt-14">{children}</div>
      {href && (
        <div className="mt-9 flex justify-center">
          <ButtonLink href={href} variant="outline" size="lg" className="w-full sm:w-auto sm:px-20">
            View All
          </ButtonLink>
        </div>
      )}
    </section>
  );
}

export default async function HomePage() {
  // Every text, number and picture on this page comes from the API.
  const [categories, newest, featured, site] = await Promise.all([
    getCategories(),
    getProducts({ sort: "newest", per_page: 4 }),
    getProducts({ featured: 1, per_page: 4 }),
    getSite(),
  ]);
  const { hero, brands } = site;

  return (
    <>
      {/* Hero */}
      <section className="bg-[#f2f0f1]">
        <div className="mx-auto grid max-w-7xl items-center gap-4 px-4 pt-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-0">
          <div className="lg:py-24">
            <h1 className="display text-[2.5rem] leading-[1.05] sm:text-6xl xl:text-[4rem]">{hero.title}</h1>
            <p className="mt-5 max-w-lg text-sm text-black/60 sm:mt-8 sm:text-base">{hero.text}</p>
            <ButtonLink href={hero.button_url} size="lg" className="mt-6 w-full sm:mt-8 sm:w-auto sm:px-16">
              {hero.button_label}
            </ButtonLink>
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:mt-12 sm:flex sm:gap-0">
              {hero.stats.map(({ value, label }, index) => (
                <div key={label} className={`sm:px-8 ${index === 0 ? "sm:pl-0" : "sm:border-l sm:border-black/10"}`}>
                  <dt className="text-3xl font-bold sm:text-[2.5rem]">{value.toLocaleString("en-US")}+</dt>
                  <dd className="text-xs text-black/60 sm:text-base">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative -mx-4 aspect-[4/3] sm:mx-0 lg:aspect-auto lg:h-[600px]">
            <Img src={hero.image} alt={hero.image_alt} sizes="(max-width: 1024px) 100vw, 45vw" priority className="!object-contain !object-bottom" />
          </div>
        </div>
      </section>

      {/* Brand strip */}
      {brands.length > 0 && (
        <div id="brands" className="bg-black py-8 text-white sm:py-11">
          <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-5 px-4 text-2xl sm:justify-between sm:px-6 sm:text-4xl">
            {brands.map((brand) => (
              <li
                key={brand.name}
                style={{
                  fontFamily: brand.font === "serif" ? 'Georgia, "Times New Roman", serif' : "inherit",
                  fontWeight: brand.weight,
                  letterSpacing: brand.spacing,
                }}
              >
                {brand.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title="New Arrivals" href="/products?sort=newest">
        <ProductGrid products={newest.products} scrollOnMobile />
        {newest.failed && <p className="text-center text-sm text-black/60">Products could not be loaded. Please try again shortly.</p>}
      </Section>

      <div className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <hr className="border-black/10" />
      </div>

      <Section title="Top Selling" href="/products?featured=1">
        <ProductGrid products={featured.products} scrollOnMobile />
      </Section>

      {categories.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
          <div className="rounded-[2.5rem] bg-[#f0f0f0] px-4 py-10 sm:px-16 sm:py-[4.5rem]">
            <h2 className="display text-center text-3xl sm:text-5xl">Browse by dress style</h2>
            <ul className="mt-8 grid grid-cols-1 gap-4 sm:mt-16 sm:grid-cols-3 sm:gap-5">
              {categories.map((style, index) => {
                // Wide, narrow / narrow, wide like the design.
                const wide = index % 4 === 1 || index % 4 === 2;
                return (
                  <li key={style.id} className={wide ? "sm:col-span-2" : ""}>
                    <Link href={`/products?category=${style.slug}`} className="group relative block h-44 overflow-hidden rounded-[1.25rem] bg-white sm:h-72">
                      <span className="absolute left-6 top-5 z-10 text-2xl font-bold sm:left-9 sm:top-6 sm:text-4xl">{style.name}</span>
                      <div className="absolute inset-y-0 right-0 w-[58%]">
                        <Img src={style.image} alt="" sizes="(max-width: 640px) 60vw, 30vw" className="transition duration-300 group-hover:scale-105" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <Testimonials reviews={site.testimonials} />
    </>
  );
}
