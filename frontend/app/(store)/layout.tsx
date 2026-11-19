import { CartProvider } from "@/components/providers/CartProvider";
import { CustomerAuthProvider } from "@/components/providers/CustomerAuth";
import { ToastProvider } from "@/components/providers/Toast";
import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { getCategories, getSite } from "@/lib/server-data";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [categories, site] = await Promise.all([getCategories(), getSite()]);

  return (
    <ToastProvider>
      <CustomerAuthProvider>
        <CartProvider>
          <Header categories={categories} site={site} />
          <main className="flex-1">{children}</main>
          <Footer site={site} />
        </CartProvider>
      </CustomerAuthProvider>
    </ToastProvider>
  );
}
