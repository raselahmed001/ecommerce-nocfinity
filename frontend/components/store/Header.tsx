"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useSyncExternalStore } from "react";
import type { Category, SiteContent } from "@/lib/types";
import { useAuth } from "../providers/CustomerAuth";
import { useCart } from "../providers/CartProvider";
import { Dropdown } from "./Dropdown";

// Tells the navbar when the page address hash (#brands) changes, because Next.js does not re-render for that.
const hashListeners = new Set<() => void>();
function subscribeHash(listener: () => void) {
  hashListeners.add(listener);
  window.addEventListener("hashchange", listener);
  return () => {
    hashListeners.delete(listener);
    window.removeEventListener("hashchange", listener);
  };
}
const notifyHash = () => hashListeners.forEach((listener) => listener());

function SearchForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [term, setTerm] = useState("");

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(term.trim() ? `/products?q=${encodeURIComponent(term.trim())}` : "/products");
        onDone?.();
      }}
      className="flex h-12 w-full items-center gap-3 rounded-full bg-surface px-5"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-40" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        maxLength={100}
        placeholder="Search for products..."
        aria-label="Search products"
        className="w-full bg-transparent text-sm outline-none placeholder:text-black/40"
      />
    </form>
  );
}

const NAV_LINKS = [
  { href: "/products?on_sale=1", label: "On Sale" },
  { href: "/products?sort=newest", label: "New Arrivals" },
  { href: "/#brands", label: "Brands" },
];

/**
 * Which navbar item is the current page. It reads the address (path, ?query and #hash),
 * so it lives in a component that is wrapped in <Suspense>.
 */
function useNavActive() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");

  const onProducts = pathname === "/products";
  const onSale = onProducts && !!searchParams.get("on_sale");
  const newest = onProducts && !onSale && searchParams.get("sort") === "newest";

  return {
    "/products": pathname.startsWith("/products") && !onSale && !newest,
    "/products?on_sale=1": onSale,
    "/products?sort=newest": newest,
    "/#brands": pathname === "/" && hash === "#brands",
  } as Record<string, boolean>;
}

function DesktopNav({ categories }: { categories: Category[] }) {
  const active = useNavActive();
  const item = (href: string) => `border-b-2 pb-1 ${active[href] ? "border-black font-medium" : "border-transparent hover:opacity-70"}`;

  return (
    <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
      <Dropdown
        summaryClassName={`flex items-center gap-1.5 ${item("/products")}`}
        summary={
          <>
            Shop
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden className="transition group-open:rotate-180">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </>
        }
        panelClassName="absolute left-0 top-full z-50 mt-3 w-48 rounded-2xl border border-black/10 bg-white p-2 text-sm shadow-lg"
      >
        <Link href="/products" className="block rounded-lg px-3 py-2 hover:bg-surface">
          All products
        </Link>
        {categories.map((category) => (
          <Link key={category.id} href={`/products?category=${category.slug}`} className="block rounded-lg px-3 py-2 hover:bg-surface">
            {category.name}
          </Link>
        ))}
      </Dropdown>
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={item(link.href)}
          aria-current={active[link.href] ? "page" : undefined}
          onClick={link.href === "/#brands" ? () => setTimeout(notifyHash, 100) : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function MobileNav({ categories, signedIn }: { categories: Category[]; signedIn: boolean }) {
  const active = useNavActive();

  return (
    <nav aria-label="Mobile" className="mt-4 flex flex-col text-base">
      <Link href="/products" className={`border-b border-black/5 py-3 ${active["/products"] ? "font-bold" : ""}`}>
        Shop
      </Link>
      {categories.map((category) => (
        <Link key={category.id} href={`/products?category=${category.slug}`} className="border-b border-black/5 py-3 pl-4 text-black/70">
          {category.name}
        </Link>
      ))}
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`border-b border-black/5 py-3 ${active[link.href] ? "font-bold" : ""}`}
          onClick={link.href === "/#brands" ? () => setTimeout(notifyHash, 100) : undefined}
        >
          {link.label}
        </Link>
      ))}
      {!signedIn && (
        <Link href="/login" className="py-3 font-medium">
          Sign in
        </Link>
      )}
    </nav>
  );
}

export function Header({ categories, site }: { categories: Category[]; site: Pick<SiteContent, "name" | "announcement"> }) {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);
  const [showBar, setShowBar] = useState(true);

  // Close the mobile menu after navigating (state adjusted while rendering, no effect needed).
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpen(false);
  }

  const count = cart?.item_count ?? 0;
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur">
      {showBar && site.announcement && (
        <div className="relative whitespace-nowrap bg-black px-2 py-2.5 text-center text-[11px] text-white sm:px-10 sm:text-sm">
          {site.announcement.text}{" "}
          <Link href={site.announcement.link_url} className="font-medium underline">
            {site.announcement.link_label}
          </Link>
          <button type="button" onClick={() => setShowBar(false)} aria-label="Close announcement" className="absolute right-3 top-1/2 hidden -translate-y-1/2 p-1 sm:block">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:h-24 sm:px-6 lg:gap-10">
        <button
          type="button"
          className="-ml-1 p-1 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <Link href="/" className="display text-2xl sm:text-[2rem]">
          {site.name}
        </Link>

        <Suspense fallback={null}>
          <DesktopNav categories={categories} />
        </Suspense>

        <div className="mx-auto hidden max-w-4xl flex-1 lg:block">
          <SearchForm />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <button type="button" className="p-2 lg:hidden" aria-label="Search" onClick={() => setOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </button>
          <Link href="/cart" className="relative p-2" aria-label={`Cart, ${count} items`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M3 4h2l2.4 11h10.2L20 7H6.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="19.5" r="1.4" />
              <circle cx="17" cy="19.5" r="1.4" />
            </svg>
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <Dropdown
              label="Account menu"
              summaryClassName="flex items-center gap-2 rounded-full p-2 hover:bg-surface"
              summary={
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c1-4 4-6 8-6s7 2 8 6" strokeLinecap="round" />
                  </svg>
                  <span className="hidden max-w-24 truncate text-sm sm:block">{user.name.split(" ")[0]}</span>
                </>
              }
              panelClassName="absolute right-0 mt-2 w-44 rounded-2xl border border-black/10 bg-white p-2 text-sm shadow-lg"
            >
              <Link href="/account/orders" className="block rounded-lg px-3 py-2 hover:bg-surface">
                My orders
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
                className="block w-full rounded-lg px-3 py-2 text-left hover:bg-surface"
              >
                Sign out
              </button>
            </Dropdown>
          ) : (
            <Link href="/login" className="rounded-full p-2 hover:bg-surface" aria-label="Sign in">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1-4 4-6 8-6s7 2 8 6" strokeLinecap="round" />
              </svg>
            </Link>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-black/10 bg-white px-4 pb-5 pt-4 lg:hidden">
          <SearchForm onDone={() => setOpen(false)} />
          <Suspense fallback={null}>
            <MobileNav categories={categories} signedIn={!!user} />
          </Suspense>
        </div>
      )}
    </header>
  );
}
