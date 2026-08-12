import Image from "next/image";
import Link from "next/link";
import Badge from "../ui/Badge";
import ProductCard from "../ui/ProductCard";
import { mediaAlt, mediaUrl } from "../../lib/media";
import type { ProductsBlockData } from "./types";

const brandColorClasses: Record<string, string> = {
  red: "text-brand-coral",
  green: "text-brand-teal",
};

export default function ProductsBlock({ block }: { block: ProductsBlockData }) {
  return (
    <section id="what-we-make" className="bg-brand-cream py-16 sm:py-20">
      <div className="section-wide text-center">
        {block.eyebrow && <Badge color="tan">{block.eyebrow}</Badge>}
        <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold text-brand-green sm:text-4xl">
          {block.heading}
        </h2>
        {block.subtext && <p className="mx-auto mt-3 max-w-xl text-brand-muted">{block.subtext}</p>}

        {block.cards && block.cards.length > 0 && (
          <div className="mt-12 grid gap-6 text-left sm:grid-cols-2">
            {block.cards.map((card) => (
              <ProductCard key={card.title} className="overflow-hidden p-0">
                <div className="relative h-48 w-full">
                  <Image
                    src={mediaUrl(card.photo)}
                    alt={mediaAlt(card.photo, card.title)}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${brandColorClasses[card.brandColor]}`}>
                    {card.brandLabel}
                  </p>
                  <p className="mt-1 font-display text-xl font-bold text-brand-green">{card.title}</p>
                  <p className="mt-2 text-sm text-brand-muted">{card.description}</p>
                  <Link
                    href={card.linkHref}
                    className={`mt-4 inline-block text-sm font-semibold underline-offset-2 hover:underline ${brandColorClasses[card.brandColor]}`}
                  >
                    {card.linkLabel} →
                  </Link>
                </div>
              </ProductCard>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
