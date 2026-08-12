import Badge from "../ui/Badge";
import type { MissionBlockData } from "./types";

export default function MissionBlock({ block }: { block: MissionBlockData }) {
  return (
    <section id="mission" className="bg-brand-green py-16 sm:py-20">
      <div className="section">
        {block.eyebrow && <Badge color="gold">{block.eyebrow}</Badge>}
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-none text-white sm:text-5xl">
          {block.headlinePrefix}{" "}
          <span className="text-brand-gold">{block.headlineHighlight}</span>
          {block.headlineSuffix}
        </h2>
        <p className="mt-5 max-w-2xl text-lg text-white/75">{block.body}</p>

        {block.features && block.features.length > 0 && (
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {block.features.map((feature) => (
              <div key={feature.heading} className="border-t border-brand-tan pt-6">
                <p className="font-display text-xl font-bold text-white">{feature.heading}</p>
                <p className="mt-2 text-base text-white/70">{feature.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
