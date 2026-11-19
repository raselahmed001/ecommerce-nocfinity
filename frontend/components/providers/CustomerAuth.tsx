"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { cartTokenStore, tokenStore } from "@/lib/storage";
import type { User } from "@/lib/types";

interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
}

interface AuthContextValue {
  user: User | null;
  /** true until we know whether a saved token is still valid */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the saved token.
  useEffect(() => {
    const restore = tokenStore.get("customer") ? api<User>("/auth/me", { scope: "customer" }).then((res) => setUser(res.data)) : Promise.resolve();

    restore.catch(() => tokenStore.set("customer", null)).finally(() => setLoading(false));
  }, []);

  // The API rejected our token: sign out locally.
  useEffect(() => {
    const onExpired = (event: Event) => {
      if ((event as CustomEvent).detail === "customer") {
        tokenStore.set("customer", null);
        setUser(null);
      }
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const finishLogin = useCallback((data: { user: User; token: string }) => {
    tokenStore.set("customer", data.token);
    cartTokenStore.set(null); // the server merged the guest cart into the customer's cart
    setUser(data.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ user: User; token: string }>("/auth/login", {
        method: "POST",
        body: { email, password },
        withCartToken: true,
      });
      finishLogin(res.data);
    },
    [finishLogin],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await api<{ user: User; token: string }>("/auth/register", {
        method: "POST",
        body: input,
        withCartToken: true,
      });
      finishLogin(res.data);
    },
    [finishLogin],
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST", scope: "customer" });
    } catch {
      /* the token may already be invalid: still sign out here */
    }
    tokenStore.set("customer", null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside CustomerAuthProvider");
  return context;
}
