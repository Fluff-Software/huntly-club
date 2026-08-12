import type { Metadata } from "next";
import { getPayloadClient } from "./lib/payload";
import BlockRenderer from "./components/blocks/BlockRenderer";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://huntly.world",
  },
};

export const revalidate = 60;

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Huntly",
  url: "https://huntly.world",
  logo: "https://huntly.world/logo.png",
  description:
    "Huntly makes technology that points children outward — toward parks, woods, streets and gardens — instead of into a screen. Two products, one mission: Huntly, the outdoor adventure app, and Huntly World, the seasonal adventure club.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "huntly@fluff.software",
    contactType: "customer support",
  },
  sameAs: [
    "https://www.huntly.app/",
    "https://apps.apple.com/us/app/huntly-world/id6745152309",
    "https://play.google.com/store/apps/details?id=software.fluff.huntlyclub",
  ],
};

export default async function HomePage() {
  const payload = await getPayloadClient();
  const home = await payload.findGlobal({ slug: "home", depth: 1 });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      {home.blocks && home.blocks.length > 0 ? (
        <BlockRenderer blocks={home.blocks} />
      ) : (
        <div className="section py-24 text-center text-brand-muted">
          <p>Homepage content hasn&apos;t been set up yet. Add blocks in the Payload admin under Globals → Homepage.</p>
        </div>
      )}
    </>
  );
}
