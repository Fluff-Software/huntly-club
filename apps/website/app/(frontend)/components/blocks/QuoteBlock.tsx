import Image from "next/image";
import { mediaAlt, mediaUrl } from "../../lib/media";
import type { QuoteBlockData } from "./types";

export default function QuoteBlock({ block }: { block: QuoteBlockData }) {
  return (
    <section className="relative min-h-[22rem] w-full overflow-hidden sm:min-h-[26rem]">
      <div className="absolute inset-0">
        <Image
          src={mediaUrl(block.backgroundImage)}
          alt={mediaAlt(block.backgroundImage)}
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-brand-green/55 to-brand-green/15" aria-hidden />
      <div className="section-wide relative flex min-h-[22rem] flex-col justify-center py-16 sm:min-h-[26rem]">
        <blockquote className="max-w-lg font-display text-2xl font-bold text-white drop-shadow sm:text-3xl">
          &ldquo;{block.quote}&rdquo;
        </blockquote>
        <p className="mt-4 text-base font-bold text-brand-cream">— {block.attribution}</p>
      </div>
    </section>
  );
}
