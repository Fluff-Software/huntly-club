import HeroBlock from "./HeroBlock";
import MissionBlock from "./MissionBlock";
import QuoteBlock from "./QuoteBlock";
import ProductsBlock from "./ProductsBlock";
import FeaturesBlock from "./FeaturesBlock";
import PartnerCtaBlock from "./PartnerCtaBlock";
import type { HomeBlock } from "./types";

export default function BlockRenderer({ blocks }: { blocks: HomeBlock[] }) {
  return (
    <>
      {blocks.map((block) => {
        switch (block.blockType) {
          case "hero":
            return <HeroBlock key={block.id} block={block} />;
          case "mission":
            return <MissionBlock key={block.id} block={block} />;
          case "quote":
            return <QuoteBlock key={block.id} block={block} />;
          case "products":
            return <ProductsBlock key={block.id} block={block} />;
          case "features":
            return <FeaturesBlock key={block.id} block={block} />;
          case "partnerCta":
            return <PartnerCtaBlock key={block.id} block={block} />;
          default:
            return null;
        }
      })}
    </>
  );
}
