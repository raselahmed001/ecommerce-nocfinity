"use client";

/** − 1 + control. Calls onChange only with a value between min and max. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled,
  label = "Quantity",
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  disabled?: boolean;
  label?: string;
}) {
  const button = "flex h-full w-11 items-center justify-center text-xl disabled:opacity-30";

  return (
    <div className="inline-flex h-11 items-center rounded-full bg-surface" role="group" aria-label={label}>
      <button type="button" className={button} disabled={disabled || value <= min} onClick={() => onChange(value - 1)} aria-label="Decrease quantity">
        −
      </button>
      <span className="min-w-8 text-center text-sm font-medium" aria-live="polite">
        {value}
      </span>
      <button type="button" className={button} disabled={disabled || value >= max} onClick={() => onChange(value + 1)} aria-label="Increase quantity">
        +
      </button>
    </div>
  );
}
