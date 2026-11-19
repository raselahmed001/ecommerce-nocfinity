"use client";

import { pageNumbers } from "@/lib/pagination";
import { useEffect, useRef, type ReactNode } from "react";
import type { ApiMeta } from "@/lib/api";
import { useAdminAuth } from "./AdminAuth";
import { Alert, Button, PageSpinner } from "../ui";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>{children}</div>;
}

/** Scrollable table with the shared admin look. */
export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-400">
          <tr>
            {head.map((cell, index) => (
              <th key={index} className="px-4 py-3 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export const Td = ({ children, className = "" }: { children?: ReactNode; className?: string }) => <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-neutral-500">
        {children}
      </td>
    </tr>
  );
}

export function Pager({ meta, onPage }: { meta: ApiMeta | null; onPage: (page: number) => void }) {
  if (!meta || meta.last_page <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-500">
      <span>
        {meta.from}-{meta.to} of {meta.total}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="outline" size="sm" shape="rounded" disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)}>
          Previous
        </Button>
        {pageNumbers(meta.current_page, meta.last_page).map((page, index) =>
          page === "…" ? (
            <span key={`gap-${index}`} className="px-1">
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPage(page)}
              aria-current={page === meta.current_page ? "page" : undefined}
              className={`h-9 min-w-9 rounded-lg px-2 font-medium ${
                page === meta.current_page ? "bg-indigo-600 text-white" : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {page}
            </button>
          ),
        )}
        <Button variant="outline" size="sm" shape="rounded" disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl outline-none dark:bg-neutral-900 sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Asks "are you sure?" before a destructive action. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" shape="rounded" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" shape="rounded" onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/** Shows its children only when the signed-in staff member has the permission. */
export function Can({ permission, children, fallback = null }: { permission: string; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useAdminAuth();
  return <>{can(permission) ? children : fallback}</>;
}

/** Whole-page guard: a staff member who opens a URL they may not use sees this, not an empty error. */
export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const { can, loading } = useAdminAuth();
  if (loading) return <PageSpinner />;
  if (!can(permission)) {
    return (
      <Alert tone="info">You do not have permission to view this page. Ask a Super Admin to give your role the <code>{permission}</code> permission.</Alert>
    );
  }
  return <>{children}</>;
}

export function LoadState({ loading, error, children }: { loading: boolean; error: string; children: ReactNode }) {
  if (error) return <Alert>{error}</Alert>;
  if (loading) return <PageSpinner />;
  return <>{children}</>;
}
