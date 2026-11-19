"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import type { ProductSummary } from "@/lib/types";
import { useCart } from "../providers/CartProvider";
import { useToast } from "../providers/Toast";
import { Alert, Button } from "../ui";
import { QuantityStepper } from "./QuantityStepper";

/** True for light swatches, so the check mark stays readable. */
function isLight(hex: string | undefined): boolean {
  if (!hex) return false;
  const n = parseInt(hex.replace("#", ""), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 186;
}

const MAX_PER_ITEM = 20; // same limit as the API (config/shop.php)

/** colorHex maps a color name to its swatch color (comes from the API). */
export function AddToCart({ product, colorHex }: { product: ProductSummary; colorHex: Record<string, string> }) {
  const { add } = useCart();
  const toast = useToast();
  // Colors and sizes only appear for products that have them. The first color is pre-selected like in the design.
  const [color, setColor] = useState(product.colors[0] ?? "");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sizeError, setSizeError] = useState("");

  if (!product.in_stock) {
    return <Alert tone="info">This product is out of stock right now.</Alert>;
  }

  const max = Math.min(product.stock, MAX_PER_ITEM);

  const submit = async () => {
    if (product.sizes.length > 0 && !size) return setSizeError("Please choose a size.");
    setSizeError("");
    setBusy(true);
    setError("");
    try {
      await add(product.id, quantity, { size: size || undefined, color: color || undefined });
      toast(`${product.name} was added to your cart.`);
    } catch (e) {
      // The API is the source of truth (stock may have changed): show its message.
      setError(
        e instanceof ApiError ? (e.field("quantity") ?? e.field("size") ?? e.field("color") ?? e.field("product_id") ?? e.message) : "Could not add to cart.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {product.colors.length > 0 && (
        <div className="border-t border-black/10 pt-6">
          <p className="mb-4 text-black/60">Select Colors</p>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Color">
            {product.colors.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={color === name}
                aria-label={name}
                title={name}
                onClick={() => setColor(name)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/20 sm:h-10 sm:w-10"
                style={{ backgroundColor: colorHex[name] ?? "#ccc" }}
              >
                {color === name && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isLight(colorHex[name]) ? "#000" : "#fff"} strokeWidth="3" aria-hidden>
                    <path d="m5 12 5 5 9-10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.sizes.length > 0 && (
        <div className="border-t border-black/10 pt-6">
          <p className="mb-4 text-black/60">Choose Size</p>
          <div className="flex flex-wrap gap-2 sm:gap-3" role="radiogroup" aria-label="Size">
            {product.sizes.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={size === name}
                onClick={() => {
                  setSize(name);
                  setSizeError("");
                }}
                className={`rounded-full px-4 py-3 text-sm sm:px-6 ${size === name ? "bg-black text-white" : "bg-surface text-black/60 hover:text-black"}`}
              >
                {name}
              </button>
            ))}
          </div>
          {sizeError && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {sizeError}
            </p>
          )}
        </div>
      )}

      <div className="border-t border-black/10 pt-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <QuantityStepper value={quantity} onChange={setQuantity} max={max} disabled={busy} />
          <Button onClick={submit} loading={busy} size="lg" className="flex-1">
            Add to Cart
          </Button>
        </div>
        <p className="mt-3 text-sm text-black/60">
          {product.stock <= 5 ? `Only ${product.stock} left in stock.` : "In stock."}{" "}
          <Link href="/cart" className="underline">
            View cart
          </Link>
        </p>
        {error && (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        )}
      </div>
    </div>
  );
}
