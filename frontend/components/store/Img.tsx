import Image from "next/image";

/**
 * Fills its (relative, sized) parent. Images come from the API (uploads or demo URLs),
 * so Next's image optimizer is skipped.
 */
export function Img({ src, alt, className = "", sizes = "(max-width: 768px) 50vw, 25vw", priority }: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src) {
    return <div className="absolute inset-0 flex items-center justify-center bg-neutral-200 text-xs text-neutral-500">No image</div>;
  }
  return <Image src={src} alt={alt} fill unoptimized sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
}
