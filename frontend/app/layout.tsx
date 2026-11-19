import type { Metadata } from "next";
import { Archivo_Black, Inter } from "next/font/google";
import { getSite } from "@/lib/server-data";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin"] });
const display = Archivo_Black({ variable: "--font-display", weight: "400", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  const name = site.name || "Store";

  return {
    title: { default: name, template: `%s | ${name}` },
    description: site.hero.text || undefined,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
