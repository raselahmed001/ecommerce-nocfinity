"use client";

import { useRef } from "react";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1 text-[#ffc633]" aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: Math.max(0, Math.min(5, Math.round(rating))) }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
          <path d="m12 2 2.9 6.6 7.1.7-5.3 4.8 1.5 7-6.2-3.6-6.2 3.6 1.5-7L2 9.3l7.1-.7z" />
        </svg>
      ))}
    </div>
  );
}

export function Testimonials({ reviews }: { reviews: { name: string; rating: number; text: string }[] }) {
  const track = useRef<HTMLUListElement>(null);
  if (reviews.length === 0) return null;

  const scroll = (direction: 1 | -1) => track.current?.scrollBy({ left: direction * 360, behavior: "smooth" });

  return (
    <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6" aria-labelledby="happy">
      <div className="flex items-end justify-between">
        <h2 id="happy" className="display text-3xl sm:text-5xl">
          Our happy customers
        </h2>
        <div className="flex gap-3">
          <button type="button" onClick={() => scroll(-1)} aria-label="Previous reviews" className="p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M19 12H5m6-6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Next reviews" className="p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <ul ref={track} className="mt-8 flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] sm:mt-10 sm:gap-5 [&::-webkit-scrollbar]:hidden">
        {reviews.map((review) => (
          <li key={review.name} className="w-[85%] shrink-0 snap-start rounded-[1.25rem] border border-black/10 p-6 sm:w-[24rem] sm:p-8">
            <Stars rating={review.rating} />
            <p className="mt-3 flex items-center gap-2 text-lg font-bold">
              {review.name}
              <svg width="20" height="20" viewBox="0 0 24 24" aria-label="Verified customer" role="img">
                <circle cx="12" cy="12" r="11" fill="#01ab31" />
                <path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </p>
            <p className="mt-2 text-sm text-black/60 sm:text-base">&ldquo;{review.text}&rdquo;</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
