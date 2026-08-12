import Image from "next/image";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { mediaAlt, mediaUrl } from "../../lib/media";
import type { PartnerCtaBlockData } from "./types";

export default function PartnerCtaBlock({ block }: { block: PartnerCtaBlockData }) {
  return (
    <section id="partners" className="bg-brand-cream py-16 sm:py-20">
      <div className="section-wide grid items-center gap-12 lg:grid-cols-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-soft">
          <Image
            src={mediaUrl(block.image)}
            alt={mediaAlt(block.image)}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div>
          {block.eyebrow && <Badge color="tan">{block.eyebrow}</Badge>}
          <h2 className="mt-4 font-display text-3xl font-bold text-brand-green sm:text-4xl">
            {block.heading}
          </h2>
          <p className="mt-4 text-brand-muted">{block.body}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {block.primaryCta && (
              <Button href={block.primaryCta.href} variant="dark">
                {block.primaryCta.label}
              </Button>
            )}
            {block.secondaryCta && (
              <Button href={block.secondaryCta.href} variant="outline">
                {block.secondaryCta.label}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
