"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { PageSpinner } from "../ui";
import { useAdminAuth } from "./AdminAuth";
import { useAdminTheme } from "./Theme";

interface NavItem {
  href: string;
  label: string;
  /** Menu entry is hidden unless the staff member has this permission. */
  permission?: string;
  icon: string;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", permission: "reports.view", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" },
  { href: "/admin/products", label: "Products", permission: "products.view", icon: "M4 7l8-4 8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10" },
  { href: "/admin/categories", label: "Categories", permission: "products.view", icon: "M4 6h16M4 12h10M4 18h6" },
  { href: "/admin/orders", label: "Orders", permission: "orders.view", icon: "M6 3h12l2 4v14H4V7l2-4zM4 7h16M9 11h6" },
  { href: "/admin/coupons", label: "Coupons", permission: "coupons.manage", icon: "M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3v3zM13 6v12" },
  { href: "/admin/customers", label: "Customers", permission: "customers.view", icon: "M16 11a4 4 0 1 0-8 0M4 21c1-4 4-6 8-6s7 2 8 6" },
  { href: "/admin/reviews", label: "Reviews", permission: "reviews.manage", icon: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z" },
  { href: "/admin/activity", label: "Activity log", permission: "activity.view", icon: "M4 5h16M4 12h16M4 19h10" },
  { href: "/admin/roles", label: "Roles & permissions", permission: "roles.manage", icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" },
  { href: "/admin/profile", label: "My profile", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6" },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, can, logout } = useAdminAuth();
  const { theme, toggle } = useAdminTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);

  useEffect(() => {
    if (!loading && !user) router.replace("/admin/login");
  }, [loading, user, router]);

  // Close the mobile menu after navigating.
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpen(false);
  }

  if (loading || !user) return <PageSpinner />;

  // Menu items the staff member is not allowed to use are not shown at all.
  const items = NAV.filter((item) => !item.permission || can(item.permission));
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col bg-neutral-900 p-4 text-neutral-200">
      <Link href="/admin" className="display mb-6 px-2 text-2xl text-white">
        Shop.co <span className="text-xs font-sans normal-case tracking-normal text-neutral-400">admin</span>
      </Link>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive(item.href) ? "bg-white font-medium text-black" : "hover:bg-white/10"}`}
            >
              <NavIcon d={item.icon} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/" className="mt-auto rounded-lg px-3 py-2 text-sm text-neutral-400 hover:text-white">
        ← View storefront
      </Link>
    </nav>
  );

  return (
    <div className="lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative h-full w-64">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
          <button type="button" className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="rounded-lg p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <div className="hidden text-right text-xs leading-tight sm:block">
              <p className="font-medium">{user.name}</p>
              <p className="text-neutral-500">{user.roles?.join(", ")}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.replace("/admin/login");
              }}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
