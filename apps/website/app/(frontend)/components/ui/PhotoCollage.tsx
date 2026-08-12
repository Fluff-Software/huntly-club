import Image from "next/image";

export type CollageImage = {
  src: string;
  alt: string;
};

// Renders 1-3 images: the first is a large rounded photo, the rest are
// smaller photos overlapping its corners, matching the hero mockup's collage.
export default function PhotoCollage({ images }: { images: CollageImage[] }) {
  const [main, ...rest] = images;
  if (!main) return null;

  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-md sm:aspect-square">
      <div className="absolute inset-0 overflow-hidden rounded-3xl shadow-soft">
        <Image src={main.src} alt={main.alt} fill sizes="(max-width: 640px) 90vw, 480px" className="object-cover" />
      </div>
      {rest[0] && (
        <div className="hidden lg:block absolute -right-3 top-4 h-20 w-20 overflow-hidden rounded-2xl border-4 border-brand-cream shadow-soft sm:-right-14 sm:top-12 sm:h-44 sm:w-44 sm:rounded-3xl sm:border-[6px]">
          <Image src={rest[0].src} alt={rest[0].alt} fill sizes="(max-width: 640px) 80px, 176px" className="object-cover" />
        </div>
      )}
      {rest[1] && (
        <div className="hidden lg:block absolute -bottom-3 -right-2 h-20 w-20 overflow-hidden rounded-2xl border-4 border-brand-cream shadow-soft sm:-bottom-10 sm:-right-6 sm:h-40 sm:w-40 sm:rounded-3xl sm:border-[5px]">
          <Image src={rest[1].src} alt={rest[1].alt} fill sizes="(max-width: 640px) 80px, 160px" className="object-cover" />
        </div>
      )}
    </div>
  );
}
