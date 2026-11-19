"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "../Select";

const options = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-black/60">Sort by:</span>
      <Select
        variant="plain"
        aria-label="Sort products"
        value={params.get("sort") ?? "popular"}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          next.delete("page");
          next.set("sort", event.target.value);
          router.push(`/products?${next.toString()}`);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
