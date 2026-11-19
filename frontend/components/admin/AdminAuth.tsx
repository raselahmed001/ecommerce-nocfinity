"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { tokenStore } from "@/lib/storage";
import type { User } from "@/lib/types";

interface AdminAuthValue {
  user: User | null;
  loading: boolean;
  /** Does the signed-in staff member have this permission? Used to show or hide menus and buttons. */
  can: (permission: string) => boolean;
  /** Returns a challenge id when the account uses 2FA and a code is still needed. */
  login: (email: string, password: string) => Promise<{ challenge: string } | null>;
  completeTwoFactor: (challenge: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the saved token.
  useEffect(() => {
    const restore = tokenStore.get("admin") ? api<User>("/admin/auth/me", { scope: "admin" }).then((res) => setUser(res.data)) : Promise.resolve();

    restore.catch(() => tokenStore.set("admin", null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onExpired = (event: Event) => {
      if ((event as CustomEvent).detail === "admin") {
        tokenStore.set("admin", null);
        setUser(null);
      }
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ user?: User; token?: string; two_factor_required?: boolean; challenge?: string }>("/admin/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (res.data.two_factor_required && res.data.challenge) return { challenge: res.data.challenge };

    tokenStore.set("admin", res.data.token!);
    setUser(res.data.user!);
    return null;
  }, []);

  const completeTwoFactor = useCallback(async (challenge: string, code: string) => {
    const res = await api<{ user: User; token: string }>("/admin/auth/two-factor-challenge", { method: "POST", body: { challenge, code } });
    tokenStore.set("admin", res.data.token);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/admin/auth/logout", { method: "POST", scope: "admin" });
    } catch {
      /* already invalid: sign out locally anyway */
    }
    tokenStore.set("admin", null);
    setUser(null);
  }, []);

  const can = useCallback(
    (permission: string) => !!user && (user.roles?.includes("Super Admin") || user.permissions?.includes(permission) || false),
    [user],
  );

  const value = useMemo(() => ({ user, loading, can, login, completeTwoFactor, logout, setUser }), [user, loading, can, login, completeTwoFactor, logout]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return context;
}
