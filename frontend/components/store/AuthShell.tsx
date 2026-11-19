import { Suspense } from "react";

/** Centered card used by the login, register and password pages. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-20">
      <h1 className="display text-center text-4xl">{title}</h1>
      {subtitle && <p className="mt-3 text-center text-sm text-black/60">{subtitle}</p>}
      <div className="mt-8 rounded-3xl border border-black/10 p-6 sm:p-8">
        <Suspense>{children}</Suspense>
      </div>
    </div>
  );
}

/** Only same-site paths are allowed after login, so ?next= cannot send people to another site. */
export function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
}
