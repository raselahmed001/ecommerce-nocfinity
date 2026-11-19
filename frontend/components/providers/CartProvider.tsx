"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { cartTokenStore } from "@/lib/storage";
import type { Cart } from "@/lib/types";
import { useAuth } from "./CustomerAuth";

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  add: (productId: number, quantity: number, options?: { size?: string; color?: string }) => Promise<void>;
  setQuantity: (itemId: number, quantity: number) => Promise<void>;
  remove: (itemId: number) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  /** Every cart call sends the login token (if any) and the guest cart token. */
  const call = useCallback(async (path: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: unknown) => {
    const res = await api<Cart>(path, { method, body, scope: "customer", withCartToken: true });
    // A guest's cart is identified by a token the server gives us on first use.
    if (res.data.guest_token) cartTokenStore.set(res.data.guest_token);
    setCart(res.data);
  }, []);

  const refresh = useCallback(async () => {
    try {
      await call("/cart");
    } finally {
      setLoading(false);
    }
  }, [call]);

  // Load the cart once we know who the user is, and again after login or logout.
  useEffect(() => {
    if (authLoading) return;
    refresh().catch(() => setLoading(false));
  }, [authLoading, user?.id, refresh]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      add: (productId, quantity, options) => call("/cart/items", "POST", { product_id: productId, quantity, size: options?.size, color: options?.color }),
      setQuantity: (itemId, quantity) => call(`/cart/items/${itemId}`, "PATCH", { quantity }),
      remove: (itemId) => call(`/cart/items/${itemId}`, "DELETE"),
      applyCoupon: (code) => call("/cart/coupon", "POST", { code }),
      removeCoupon: () => call("/cart/coupon", "DELETE"),
      refresh,
    }),
    [cart, loading, call, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
