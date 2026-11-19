"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

type Theme = "light" | "dark";

const KEY = "volta.admin_theme";
const listeners = new Set<() => void>();

/** Saved choice, or the system preference the first time. */
function readTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light"; // storage blocked
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

/** Wraps the whole admin area. Dark mode is a class on this wrapper, so the storefront is never affected. */
export function AdminThemeProvider({ children }: { children: ReactNode }) {
  // The server always renders "light"; the browser switches to the saved theme after hydration.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);

  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(KEY, readTheme() === "dark" ? "light" : "dark");
    } catch {
      /* cannot save: the choice only lasts until reload */
    }
    listeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      <div className={`${theme === "dark" ? "dark" : ""} min-h-screen`}>
        <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">{children}</div>
      </div>
    </ThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useAdminTheme must be used inside AdminThemeProvider");
  return context;
}
