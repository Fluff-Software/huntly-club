import Card from "../ui/Card";
import IconChip from "../ui/IconChip";
import type { FeaturesBlockData } from "./types";

export default function FeaturesBlock({ block }: { block: FeaturesBlockData }) {
  return (
    <section className="bg-brand-beige py-16 sm:py-20">
      <div className="section-wide text-center">
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold text-brand-green sm:text-4xl">
          {block.heading}
        </h2>

        {block.items && block.items.length > 0 && (
          <div className="mt-10 grid gap-6 text-left sm:grid-cols-3">
            {block.items.map((item) => (
              <Card key={item.heading}>
                <IconChip color={item.iconChipColor} />
                <p className="mt-4 font-display text-xl font-bold text-brand-green">{item.heading}</p>
                <p className="mt-1 text-base text-brand-muted">{item.description}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
