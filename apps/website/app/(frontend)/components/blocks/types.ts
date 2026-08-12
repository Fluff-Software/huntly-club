import type { Home } from "../../../../payload-types";

export type HomeBlock = NonNullable<Home["blocks"]>[number];

export type HeroBlockData = Extract<HomeBlock, { blockType: "hero" }>;
export type MissionBlockData = Extract<HomeBlock, { blockType: "mission" }>;
export type QuoteBlockData = Extract<HomeBlock, { blockType: "quote" }>;
export type ProductsBlockData = Extract<HomeBlock, { blockType: "products" }>;
export type FeaturesBlockData = Extract<HomeBlock, { blockType: "features" }>;
export type PartnerCtaBlockData = Extract<HomeBlock, { blockType: "partnerCta" }>;
