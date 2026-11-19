import type { Metadata } from "next";
import { AdminAuthProvider } from "@/components/admin/AdminAuth";
import { AdminThemeProvider } from "@/components/admin/Theme";
import { ToastProvider } from "@/components/providers/Toast";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Shop.co Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <ToastProvider>
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </ToastProvider>
    </AdminThemeProvider>
  );
}
