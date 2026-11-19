"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Category, SiteContent } from "@/lib/types";

type FilterOptions = SiteContent["filters"];


/** True for light swatches, so the check mark stays readable. */
function isLight(hex: string): boolean {
  const n = parseInt(hex.replace("#", ""), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 186;
}

/** Keep every current filter, change only some of them, and drop the page number. */
function withParams(current: URLSearchParams, changes: Record<string, string | null>): string {
  const next = new URLSearchParams(current.toString());
  next.delete("page");
  Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
  const query = next.toString();
  return query ? `/products?${query}` : "/products";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group border-t border-black/10 py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xl font-bold">
        {title}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="transition group-open:rotate-180" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function LinkRow({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center justify-between py-2 text-black/60 hover:text-black ${active ? "font-bold text-black" : ""}`}>
      {label}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}

function FilterBody({ categories, options }: { categories: Category[]; options: FilterOptions }) {
  const { sizes, colors, price_max: PRICE_MAX } = options;
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("category");

  // Draft values: nothing is sent until "Apply Filter" is pressed.
  const [min, setMin] = useState(Number(params.get("min_price") ?? 0));
  const [max, setMax] = useState(Number(params.get("max_price") ?? PRICE_MAX));
  const [color, setColor] = useState(params.get("color") ?? "");
  const [size, setSize] = useState(params.get("size") ?? "");

  // Clothing types come from the dress style (parent category) that is open right now.
  const parent = categories.find((c) => c.slug === active || c.children?.some((child) => child.slug === active));
  const types = parent?.children ?? [];

  const apply = () => {
    router.push(
      withParams(params, {
        min_price: min > 0 ? String(min) : null,
        max_price: max < PRICE_MAX ? String(max) : null,
        color: color || null,
        size: size || null,
      }),
    );
  };

  const hasFilters = ["category", "min_price", "max_price", "color", "size", "q", "on_sale", "featured"].some((key) => params.get(key));

  return (
    <div>
      {types.length > 0 && (
        <div className="pb-4">
          {types.map((type) => (
            <LinkRow key={type.id} href={withParams(params, { category: type.slug })} label={type.name} active={active === type.slug} />
          ))}
        </div>
      )}

      <Section title="Price">
        <div className="space-y-3">
          <div className="relative h-5">
            <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface" />
            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-black"
              style={{ left: `${(min / PRICE_MAX) * 100}%`, right: `${100 - (max / PRICE_MAX) * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={PRICE_MAX}
              step={5}
              value={min}
              onChange={(e) => setMin(Math.min(Number(e.target.value), max - 5))}
              aria-label="Minimum price"
              className="range-thumb"
            />
            <input
              type="range"
              min={0}
              max={PRICE_MAX}
              step={5}
              value={max}
              onChange={(e) => setMax(Math.max(Number(e.target.value), min + 5))}
              aria-label="Maximum price"
              className="range-thumb"
            />
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>${min}</span>
            <span>{max >= PRICE_MAX ? `$${PRICE_MAX}+` : `$${max}`}</span>
          </div>
        </div>
      </Section>

      {colors.length > 0 && (
        <Section title="Colors">
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Color">
            {colors.map(({ name, hex }) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={color === name}
                aria-label={name}
                title={name}
                onClick={() => setColor(color === name ? "" : name)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/20"
                style={{ backgroundColor: hex }}
              >
                {color === name && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isLight(hex) ? "#000" : "#fff"} strokeWidth="3" aria-hidden>
                    <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Size">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
          {sizes.map((name) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={size === name}
              onClick={() => setSize(size === name ? "" : name)}
              className={`rounded-full px-4 py-2 text-sm ${size === name ? "bg-black text-white" : "bg-surface text-black/60 hover:text-black"}`}
            >
              {name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Dress Style">
        {categories.map((style) => (
          <LinkRow key={style.id} href={withParams(params, { category: style.slug })} label={style.name} active={parent?.id === style.id} />
        ))}
      </Section>

      <button type="button" onClick={apply} className="mt-2 h-12 w-full rounded-full bg-black text-sm font-medium text-white hover:bg-neutral-800">
        Apply Filter
      </button>
      {hasFilters && (
        <Link href="/products" className="mt-3 block text-center text-sm underline">
          Clear all filters
        </Link>
      )}
    </div>
  );
}

/** Sidebar on large screens, a toggle button with a panel on small screens. */
export function ProductFilters({ categories, options }: { categories: Category[]; options: FilterOptions }) {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  // Re-create the draft state whenever the URL filters change.
  const key = params.toString();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Filters"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
        </svg>
      </button>

      <aside
        className={`${
          open ? "fixed inset-0 z-50 block overflow-y-auto bg-white px-5 py-5" : "hidden"
        } lg:static lg:z-auto lg:block lg:h-fit lg:w-72 lg:shrink-0 lg:overflow-visible lg:rounded-[1.25rem] lg:border lg:border-black/10 lg:p-5`}
        aria-label="Filters"
      >
        <h2 className="mb-4 flex items-center justify-between text-xl font-bold">
          Filters
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="hidden opacity-40 lg:block" aria-hidden>
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" strokeLinecap="round" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </svg>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="p-1 lg:hidden">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </h2>
        <FilterBody key={key} categories={categories} options={options} />
      </aside>
    </>
  );
}
