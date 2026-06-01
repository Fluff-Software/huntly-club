import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Huntly World subscription pricing — coming soon.",
};

export default function PricingPage() {
  return (
    <div className="section py-20 text-center">
      <h1 className="text-3xl font-bold text-huntly-forest sm:text-4xl">Pricing coming soon</h1>
      <p className="mt-4 text-huntly-slate">
        We&apos;re finalising our subscription plans. In the meantime,{" "}
        <Link href="/download" className="font-medium text-huntly-forest underline-offset-2 hover:underline">
          download the app
        </Link>{" "}
        and explore the free introductory content.
      </p>
    </div>
  );
}

// import type { Metadata } from "next";
// import Link from "next/link";

// export const metadata: Metadata = {
//   title: "Huntly World Pricing — Join the Adventure Club",
//   description:
//     "Simple, honest pricing for Huntly World — the outdoor adventure club for children aged 4–14. Monthly and annual subscriptions available.",
//   openGraph: {
//     title: "Huntly World Pricing — Join the Adventure Club",
//     description:
//       "Simple, honest pricing for Huntly World — the outdoor adventure club for children aged 4–14. Monthly and annual subscriptions available.",
//   },
//   alternates: {
//     canonical: "https://huntly.world/pricing",
//   },
// };

// const breadcrumbSchema = {
//   "@context": "https://schema.org",
//   "@type": "BreadcrumbList",
//   itemListElement: [
//     { "@type": "ListItem", position: 1, name: "Home", item: "https://huntly.world" },
//     { "@type": "ListItem", position: 2, name: "Pricing", item: "https://huntly.world/pricing" },
//   ],
// };

// const softwareApplicationSchema = {
//   "@context": "https://schema.org",
//   "@type": "SoftwareApplication",
//   name: "Huntly World",
//   operatingSystem: "iOS, Android",
//   applicationCategory: "EducationalApplication",
//   description:
//     "An outdoor adventure club app for children aged 4–14. Weekly missions, story-driven seasons, team challenges and achievement tracking.",
//   offers: [
//     {
//       "@type": "Offer",
//       name: "Monthly",
//       // TODO: Replace with actual monthly price
//       price: "0",
//       priceCurrency: "GBP",
//       billingIncrement: "P1M",
//     },
//     {
//       "@type": "Offer",
//       name: "Annual",
//       // TODO: Replace with actual annual price
//       price: "0",
//       priceCurrency: "GBP",
//       billingIncrement: "P1Y",
//     },
//   ],
//   url: "https://huntly.world",
// };

// export default function PricingPage() {
//   return (
//     <>
//       <script
//         type="application/ld+json"
//         dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
//       />
//       <script
//         type="application/ld+json"
//         dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
//       />

//       <div className="bg-huntly-stone/20 py-10 sm:py-12">
//         <div className="section">
//           <div className="mx-auto max-w-2xl">
//             <p className="mb-2 text-sm text-huntly-slate">
//               <Link href="/" className="underline-offset-2 hover:underline">Home</Link>
//               {" / "}Pricing
//             </p>
//             <h1 className="font-display text-3xl font-bold text-huntly-forest sm:text-4xl">
//               Simple, honest pricing
//             </h1>
//             <p className="mt-4 text-huntly-slate sm:text-lg">
//               One subscription. The full adventure. No ads, no hidden extras, no surprise charges. Just weekly outdoor missions for your family.
//             </p>
//           </div>
//         </div>
//       </div>

//       <div className="section py-12 sm:py-16">
//         <div className="mx-auto max-w-2xl space-y-10">

//           {/* Pricing cards */}
//           {/* TODO: Replace placeholder prices with actual figures */}
//           <div className="grid gap-6 sm:grid-cols-2">
//             {/* Monthly */}
//             <div className="flex flex-col rounded-3xl border border-huntly-stone/70 bg-white/90 p-7 shadow-soft">
//               <p className="text-sm font-semibold uppercase tracking-wide text-huntly-slate">Monthly</p>
//               <div className="my-4">
//                 <p className="font-display text-4xl font-bold text-huntly-forest">
//                   £X.XX
//                   {/* TODO: Replace with actual monthly price */}
//                 </p>
//                 <p className="text-sm text-huntly-slate">per month</p>
//               </div>
//               <ul className="flex-1 space-y-2 text-sm text-huntly-slate">
//                 {[
//                   "Full access to the current season",
//                   "Weekly outdoor missions",
//                   "All three teams unlocked",
//                   "Parent progress view",
//                   "Cancel any time",
//                 ].map((feature) => (
//                   <li key={feature} className="flex items-start gap-2">
//                     <span className="mt-0.5 text-huntly-moss">✓</span>
//                     {feature}
//                   </li>
//                 ))}
//               </ul>
//               <Link
//                 href="https://apps.apple.com/us/app/huntly-world/id6745152309"
//                 className="btn-primary mt-6 text-center"
//               >
//                 Get started
//               </Link>
//             </div>

//             {/* Annual */}
//             <div className="flex flex-col rounded-3xl border-2 border-huntly-forest bg-huntly-forest/5 p-7 shadow-soft">
//               <div className="flex items-start justify-between">
//                 <p className="text-sm font-semibold uppercase tracking-wide text-huntly-slate">Annual</p>
//                 <span className="rounded-full bg-huntly-moss px-3 py-1 text-xs font-bold text-white">
//                   Best value
//                 </span>
//               </div>
//               <div className="my-4">
//                 <p className="font-display text-4xl font-bold text-huntly-forest">
//                   £XX
//                   {/* TODO: Replace with actual annual price */}
//                 </p>
//                 <p className="text-sm text-huntly-slate">per year — save X months</p>
//                 {/* TODO: Add monthly equivalent and savings amount */}
//               </div>
//               <ul className="flex-1 space-y-2 text-sm text-huntly-slate">
//                 {[
//                   "Everything in Monthly",
//                   "Access to all past seasons",
//                   "Priority access to new seasons",
//                   "Founding member recognition",
//                   "Cancel any time",
//                 ].map((feature) => (
//                   <li key={feature} className="flex items-start gap-2">
//                     <span className="mt-0.5 text-huntly-moss">✓</span>
//                     {feature}
//                   </li>
//                 ))}
//               </ul>
//               <Link
//                 href="https://apps.apple.com/us/app/huntly-world/id6745152309"
//                 className="btn-primary mt-6 text-center"
//               >
//                 Get started — best value
//               </Link>
//             </div>
//           </div>

//           {/* Free tier note */}
//           <div className="rounded-2xl border border-huntly-stone/70 bg-white/90 p-5 shadow-soft">
//             <p className="font-semibold text-huntly-forest">Try before you subscribe</p>
//             <p className="mt-1 text-sm text-huntly-slate">
//               The app is free to download. Download it now and explore the introductory content before committing to a subscription.
//             </p>
//             <div className="mt-4 flex flex-wrap gap-3">
//               <Link href="https://apps.apple.com/us/app/huntly-world/id6745152309" className="text-sm font-medium text-huntly-forest underline-offset-2 hover:underline">
//                 App Store →
//               </Link>
//               <Link href="https://play.google.com/store/apps/details?id=software.fluff.huntlyclub" className="text-sm font-medium text-huntly-forest underline-offset-2 hover:underline">
//                 Google Play →
//               </Link>
//             </div>
//           </div>

//           {/* School pricing */}
//           <div className="rounded-2xl border border-huntly-stone/70 bg-white/90 p-5 shadow-soft">
//             <p className="font-semibold text-huntly-forest">Schools and clubs</p>
//             <p className="mt-1 text-sm text-huntly-slate">
//               Group and school pricing is available for qualifying settings. Get in touch and we&apos;ll work out what makes sense for your situation.
//             </p>
//             <Link href="/schools" className="mt-4 inline-block text-sm font-medium text-huntly-forest underline-offset-2 hover:underline">
//               Learn about Huntly World for schools →
//             </Link>
//           </div>

//           {/* Trust signals */}
//           <div className="rounded-2xl bg-huntly-forest/5 p-6 ring-1 ring-huntly-forest/20">
//             <p className="font-semibold text-huntly-forest">Our promise to families</p>
//             <ul className="mt-3 space-y-2 text-sm text-huntly-slate">
//               {[
//                 "No ads — ever. The subscription is how we make the business work.",
//                 "No hidden extras. The subscription price is the whole price.",
//                 "Cancel any time. No lock-ins, no cancellation fees.",
//                 "Your data stays yours. We don't sell it, ever.",
//               ].map((point) => (
//                 <li key={point} className="flex items-start gap-2">
//                   <span className="mt-0.5 text-huntly-moss">✓</span>
//                   {point}
//                 </li>
//               ))}
//             </ul>
//             <div className="mt-4">
//               <Link href="/parents" className="text-sm font-medium text-huntly-forest underline-offset-2 hover:underline">
//                 Read the full parent guide →
//               </Link>
//             </div>
//           </div>

//           <p className="text-center text-xs text-huntly-slate">
//             Subscriptions managed through the App Store or Google Play. Prices shown are indicative — confirm in the app before subscribing.
//           </p>

//         </div>
//       </div>

//       {/* CTA */}
//       <section className="border-t border-huntly-leaf/40 bg-huntly-leaf/20 py-14 sm:py-16">
//         <div className="section text-center">
//           <h2 className="font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
//             Ready to join the adventure?
//           </h2>
//           <p className="mt-3 text-huntly-slate">
//             Download the app and start with the free introductory content today.
//           </p>
//           <div className="mt-6 flex flex-wrap justify-center gap-3">
//             <Link
//               href="https://apps.apple.com/us/app/huntly-world/id6745152309"
//               className="btn-primary"
//             >
//               Download on App Store
//             </Link>
//             <Link
//               href="https://play.google.com/store/apps/details?id=software.fluff.huntlyclub"
//               className="btn-primary"
//             >
//               Download on Google Play
//             </Link>
//           </div>
//           <p className="mt-4 text-sm text-huntly-slate">
//             Questions?{" "}
//             <Link href="/how-it-works" className="font-medium text-huntly-forest underline-offset-2 hover:underline">
//               See how the club works →
//             </Link>
//           </p>
//         </div>
//       </section>
//     </>
//   );
// }
