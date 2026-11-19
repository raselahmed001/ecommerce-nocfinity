import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white";

const variants: Record<Variant, string> = {
  primary: "bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200",
  outline: "border border-black/20 text-black hover:bg-black/5 dark:border-white/25 dark:text-white dark:hover:bg-white/10",
  ghost: "text-black hover:bg-black/5 dark:text-white dark:hover:bg-white/10",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-6 text-sm", lg: "h-14 px-10 text-base" };

interface StyleProps {
  variant?: Variant;
  size?: keyof typeof sizes;
  /** Storefront buttons are pills, admin buttons are slightly rounded. */
  shape?: "pill" | "rounded";
  className?: string;
}

function classes({ variant = "primary", size = "md", shape = "pill", className = "" }: StyleProps) {
  return `${base} ${variants[variant]} ${sizes[size]} ${shape === "pill" ? "rounded-full" : "rounded-lg"} ${className}`;
}

export function Button({
  variant,
  size,
  shape,
  className,
  loading,
  children,
  disabled,
  ...rest
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...rest} disabled={disabled || loading} className={classes({ variant, size, shape, className })}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant,
  size,
  shape,
  className,
  children,
}: StyleProps & { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={classes({ variant, size, shape, className })}>
      {children}
    </Link>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-label="Loading" role="img">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-90" />
    </svg>
  );
}

export function PageSpinner() {
  return (
    <div className="flex justify-center py-24 text-black/60 dark:text-white/60">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

const inputBase =
  "w-full border bg-white px-4 text-sm text-black placeholder:text-black/40 outline-none transition focus:border-black dark:bg-neutral-900 dark:text-white dark:placeholder:text-white/40 dark:focus:border-white";

export function Field({
  label,
  error,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-black/55 dark:text-white/55">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ invalid, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      className={`${inputBase} h-11 rounded-xl ${invalid ? "border-red-500" : "border-black/15 dark:border-white/20"} ${className}`}
    />
  );
}

// Select2-style dropdown (client component), same props as a native <select>.
export { Select } from "./Select";

export function Textarea({ invalid, className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...rest}
      aria-invalid={invalid || undefined}
      className={`${inputBase} min-h-28 rounded-xl py-3 ${invalid ? "border-red-500" : "border-black/15 dark:border-white/20"} ${className}`}
    />
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
    success: "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200",
    info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "red" | "amber" | "blue" }) {
  const tones = {
    gray: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
    green: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
    red: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, "gray" | "green" | "red" | "amber" | "blue"> = {
    pending: "amber",
    paid: "blue",
    processing: "blue",
    shipped: "blue",
    delivered: "green",
    cancelled: "red",
  };
  return <Badge tone={tone[status] ?? "gray"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}
