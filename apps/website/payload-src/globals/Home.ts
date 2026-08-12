import type { GlobalConfig } from "payload";

import { HeroBlock } from "../blocks/HeroBlock";
import { MissionBlock } from "../blocks/MissionBlock";
import { QuoteBlock } from "../blocks/QuoteBlock";
import { ProductsBlock } from "../blocks/ProductsBlock";
import { FeaturesBlock } from "../blocks/FeaturesBlock";
import { PartnerCtaBlock } from "../blocks/PartnerCtaBlock";

export const Home: GlobalConfig = {
  slug: "home",
  label: "Homepage",
  access: {
    read: () => true,
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: "blocks",
      type: "blocks",
      minRows: 1,
      blocks: [HeroBlock, MissionBlock, QuoteBlock, ProductsBlock, FeaturesBlock, PartnerCtaBlock],
    },
  ],
};
