"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A <details> menu that closes when you click anywhere else, press Escape,
 * or pick something inside it (a native <details> stays open otherwise).
 */
export function Dropdown({
  summary,
  summaryClassName = "",
  panelClassName = "",
  label,
  className = "relative",
  children,
}: {
  summary: ReactNode;
  summaryClassName?: string;
  panelClassName?: string;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = () => {
      if (ref.current) ref.current.open = false;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details ref={ref} className={`group ${className}`}>
      <summary aria-label={label} className={`cursor-pointer list-none ${summaryClassName}`}>
        {summary}
      </summary>
      <div
        className={panelClassName}
        onClick={() => {
          if (ref.current) ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
