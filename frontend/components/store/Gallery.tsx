"use client";

import { useState } from "react";
import { Img } from "./Img";

export function Gallery({ images, name }: { images: { id: number; url: string; is_primary: boolean }[]; name: string }) {
  const start = Math.max(0, images.findIndex((image) => image.is_primary));
  const [active, setActive] = useState(start);

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
      {images.length > 1 && (
        <div className="grid grid-cols-3 gap-3 md:flex md:flex-col" role="tablist" aria-label="Product images">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Show image ${index + 1}`}
              onClick={() => setActive(index)}
              className={`relative aspect-square w-full shrink-0 overflow-hidden rounded-[1.25rem] bg-surface md:h-36 md:w-36 md:aspect-auto ${
                index === active ? "ring-2 ring-black" : "opacity-80 hover:opacity-100"
              }`}
            >
              <Img src={image.url} alt="" sizes="144px" />
            </button>
          ))}
        </div>
      )}
      <div className="relative aspect-square w-full overflow-hidden rounded-[1.25rem] bg-surface">
        <Img src={images[active]?.url} alt={name} sizes="(max-width: 768px) 100vw, 50vw" priority />
      </div>
    </div>
  );
}
