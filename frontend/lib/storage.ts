// localStorage wrapper. Reads and writes can throw (private mode, blocked storage), so
// every call is guarded and the app keeps working without it.

export type TokenScope = "customer" | "admin";

const KEYS = {
  customer: "volta.customer_token",
  admin: "volta.admin_token",
  cart: "volta.cart_token",
} as const;

function read(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (typeof window === "undefined") return;
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: ignore */
  }
}

export const tokenStore = {
  get: (scope: TokenScope) => read(KEYS[scope]),
  set: (scope: TokenScope, token: string | null) => write(KEYS[scope], token),
};

export const cartTokenStore = {
  get: () => read(KEYS.cart),
  set: (token: string | null) => write(KEYS.cart, token),
};
