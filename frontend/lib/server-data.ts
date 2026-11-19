// Data loaders for server components. They never throw: when the API is down the page
// shows an empty state instead of crashing.
import { api, type ApiMeta } from "./api";
import type { Category, ProductSummary, SiteContent } from "./types";

export async function getCategories(): Promise<Category[]> {
  try {
    return (await api<Category[]>("/categories")).data;
  } catch {
    return [];
  }
}

export interface ProductPage {
  products: ProductSummary[];
  meta: ApiMeta | null;
  failed: boolean;
}

export async function getProducts(query: Record<string, string | number | undefined>): Promise<ProductPage> {
  try {
    const res = await api<ProductSummary[]>("/products", { query });
    return { products: res.data, meta: res.meta ?? null, failed: false };
  } catch {
    return { products: [], meta: null, failed: true };
  }
}

/** Content used when the API is down: empty, so pages still render without any made-up text. */
const EMPTY_SITE: SiteContent = {
  name: "",
  announcement: null,
  hero: { title: "", text: "", button_label: "Shop", button_url: "/products", image: null, image_alt: "", stats: [] },
  brands: [],
  testimonials: [],
  newsletter: null,
  footer: { about: "", columns: [], socials: [] },
  payments: [],
  filters: { sizes: [], colors: [], price_max: 100 },
};

export async function getSite(): Promise<SiteContent> {
  try {
    return (await api<SiteContent>("/site")).data;
  } catch {
    return EMPTY_SITE;
  }
}
