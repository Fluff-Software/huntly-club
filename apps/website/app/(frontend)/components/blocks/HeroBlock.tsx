import Badge from "../ui/Badge";
import Button from "../ui/Button";
import PhotoCollage from "../ui/PhotoCollage";
import { mediaAlt, mediaUrl } from "../../lib/media";
import type { HeroBlockData } from "./types";

export default function HeroBlock({ block }: { block: HeroBlockData }) {
  const images = (block.images ?? []).map((item) => ({
    src: mediaUrl(item.image),
    alt: item.alt || mediaAlt(item.image),
  }));

  return (
    <section className="-mt-16 bg-brand-cream pt-16 pb-16 sm:-mt-20 sm:pt-36 sm:pb-20">
      <div className="section-wide grid items-center gap-12 lg:grid-cols-2">
        <div>
          {/* {block.eyebrow && <Badge color="tan">{block.eyebrow}</Badge>} */}
          <h1 className="mt-4 whitespace-pre-line font-display text-4xl font-extrabold leading-none text-brand-green sm:text-[3.25rem]">
            {block.headline}
          </h1>
          <p className="mt-8 text-xl text-brand-muted">{block.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {block.primaryCta && (
              <Button href={block.primaryCta.href} variant="primary">
                {block.primaryCta.label}
              </Button>
            )}
            {block.secondaryCta && (
              <Button href={block.secondaryCta.href} variant="outline">
                {block.secondaryCta.label}
              </Button>
            )}
          </div>
          {block.caption && <p className="mt-4 text-sm text-brand-muted/80">{block.caption}</p>}
        </div>
        {images.length > 0 && <PhotoCollage images={images} />}
      </div>
    </section>
  );
}
