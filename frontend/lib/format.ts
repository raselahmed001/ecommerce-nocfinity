const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** "449.00" -> "$449.00" */
export function money(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return currency.format(Number(value));
}

/** Percentage saved when a discount price exists. */
export function discountPercent(price: string, discountPrice: string | null): number {
  if (!discountPrice) return 0;
  const full = Number(price);
  if (full <= 0) return 0;
  return Math.round(((full - Number(discountPrice)) / full) * 100);
}

export function date(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** "price_asc" -> "Price asc" style labels for status words. */
export function titleCase(value: string): string {
  return value.replace(/[_.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
