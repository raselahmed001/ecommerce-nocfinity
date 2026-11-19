/** Star rating with half stars, e.g. 4.5 -> 4 and a half stars + "4.5/5". Renders nothing without a rating. */
export function Stars({ rating }: { rating: string | number | null | undefined }) {
  if (rating === null || rating === undefined || rating === "") return null;
  const value = Number(rating);

  return (
    <div className="flex items-center gap-2" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <div className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = Math.max(0, Math.min(1, value - (n - 1))); // 0, 0.5 or 1
          return (
            <span key={n} className="relative inline-block h-[18px] w-[18px]">
              <Star className="absolute inset-0 text-black/15" />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className="text-[#ffc633]" />
              </span>
            </span>
          );
        })}
      </div>
      <span className="text-sm text-black/60">
        <span className="text-black">{value.toFixed(1)}</span>/5
      </span>
    </div>
  );
}

function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`h-[18px] w-[18px] ${className}`}>
      <path d="m12 2 2.9 6.6 7.1.7-5.3 4.8 1.5 7-6.2-3.6-6.2 3.6 1.5-7L2 9.3l7.1-.7z" />
    </svg>
  );
}
