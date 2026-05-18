import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "A Flexible Alternative to Scouts and Beavers for UK Families",
  description:
    "Looking for a flexible kids adventure club that works around your family schedule? Huntly World offers weekly outdoor missions, story-driven seasons and team challenges — on your terms.",
  openGraph: {
    title: "A Flexible Alternative to Scouts and Beavers for UK Families | Huntly World",
    description:
      "Looking for a flexible kids adventure club that works around your family schedule? Huntly World offers weekly outdoor missions, story-driven seasons and team challenges — on your terms.",
  },
  alternates: {
    canonical: "https://huntly.world/scouts-alternative",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://huntly.world" },
    { "@type": "ListItem", position: 2, name: "Scouts alternative", item: "https://huntly.world/scouts-alternative" },
  ],
};

const faqs = [
  {
    question: "Is Huntly World instead of Scouts, or as well as?",
    answer:
      "That's entirely up to your family. Many families use Huntly World alongside Scouts or Beavers — as a way to keep the outdoor adventure going between meetings, or over school holidays. Others use it as their primary club, especially if scheduling doesn't work for traditional groups.",
  },
  {
    question: "Is there a fixed meeting time or location?",
    answer:
      "No. Huntly World missions can be done any time, in any outdoor space — your garden, the local park, woods, or wherever suits you. There's no fixed meeting time, no uniform, and no register to sign.",
  },
  {
    question: "How is Huntly World different from a nature journal or activity book?",
    answer:
      "Huntly World is a living adventure that unfolds over seasons and chapters, with weekly missions tied to an ongoing story. It's not a one-off book — it's an outdoor adventure club with characters, teams, and a progression system that keeps children engaged over months.",
  },
  {
    question: "Is Huntly World safe for children?",
    answer:
      "Yes. The app contains no advertising, no social features, and no stranger interaction. Missions are parent-guided outdoor activities. See our For Parents page for full details on safety and privacy.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export default function ScoutsAlternativePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="bg-huntly-stone/20 py-10 sm:py-12">
        <div className="section">
          <div className="mx-auto max-w-2xl">
            <p className="mb-2 text-sm text-huntly-slate">
              <Link href="/" className="underline-offset-2 hover:underline">Home</Link>
              {" / "}Flexible kids adventure club
            </p>
            <h1 className="font-display text-3xl font-bold text-huntly-forest sm:text-4xl">
              Looking for a flexible kids adventure club?
            </h1>
            <p className="mt-4 text-huntly-slate sm:text-lg">
              Huntly World is a structured outdoor adventure club for children aged 5–10 — with weekly missions, story-driven seasons, and team challenges. No fixed meeting times. No specific location. Just great adventures, whenever your family is ready.
            </p>
          </div>
        </div>
      </div>

      <div className="section py-12 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-14">

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              Why families choose Huntly World
            </h2>
            <p className="text-huntly-slate">
              Scouts, Beavers, and Guides do brilliant things for children. But they run on a fixed schedule — Tuesday evenings, Thursday afternoons — and for many families, that just doesn&apos;t fit. Work patterns change. Siblings have their own activities. Weekends fill up. And when life gets busy, a standing commitment can become a source of stress rather than joy.
            </p>
            <p className="mt-3 text-huntly-slate">
              Huntly World is built for families who want all the good stuff — outdoor adventure, structured challenges, progression, characters to love — without the fixed timetable. Do a mission on a Sunday morning. Pack one into a half-term. Go at your own pace.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              How it works differently
            </h2>
            <div className="mt-4 space-y-4">
              {[
                {
                  title: "No fixed meeting time",
                  body: "Missions are available whenever you are. Do them on a walk, in the park, on holiday — anywhere with a bit of outdoor space.",
                },
                {
                  title: "Story-driven adventure",
                  body: "Each season tells an unfolding story that keeps children genuinely hooked. It's not just activities — it's a world they're part of.",
                },
                {
                  title: "Team belonging without the logistics",
                  body: "Children pick a team and build points through missions. All the camaraderie of a club, without needing to coordinate with other families' schedules.",
                },
                {
                  title: "Designed for all outdoor spaces",
                  body: "Missions work in a garden, a local park, or woodland. You don't need a specific meeting place or specialist kit.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-huntly-stone/70 bg-white/90 p-5 shadow-soft"
                >
                  <p className="font-semibold text-huntly-forest">{item.title}</p>
                  <p className="mt-1 text-sm text-huntly-slate">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              What children get from the club
            </h2>
            <p className="text-huntly-slate">
              Huntly World gives children a real sense of belonging — a team, a captain to look up to, and an adventure that&apos;s genuinely theirs. Weekly outdoor missions build the habit of getting outside and exploring. The story structure means there&apos;s always something to look forward to. And the achievement system means progress feels real and earned.
            </p>
            <p className="mt-3 text-huntly-slate">
              Children aged 5–10 who use Huntly World regularly spend more time outside, show more curiosity about the natural world, and report that they love completing missions with their family. The best part? They ask to go out.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              For families where Scouts doesn&apos;t quite fit
            </h2>
            <p className="text-huntly-slate">
              Scouts, Beavers and Cubs are wonderful institutions. If they work for your family, brilliant — keep going. Huntly World isn&apos;t here to replace them. But for families where the schedule doesn&apos;t work, where there&apos;s a waiting list, where a child is too young, or where the structure of a weekly group isn&apos;t quite right, Huntly World fills that gap with something equally structured, equally adventurous, and completely flexible.
            </p>
          </div>

          <div>
            <h2 className="mb-6 font-display text-2xl font-bold text-huntly-forest">
              Frequently asked questions
            </h2>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="rounded-2xl border border-[var(--color-border-subtle)] bg-white/90 shadow-soft"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-huntly-forest [&::-webkit-details-marker]:hidden">
                    {faq.question}
                  </summary>
                  <p className="border-t border-[var(--color-border-subtle)] px-5 py-4 text-sm text-huntly-slate">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-huntly-stone/70 bg-white/90 p-6 shadow-soft">
            <p className="font-semibold text-huntly-forest">Want the full picture before you sign up?</p>
            <p className="mt-1 text-sm text-huntly-slate">
              Read our parent guide covering safety, privacy, parental controls, and how the app works in practice.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/parents" className="text-sm font-medium text-huntly-forest underline-offset-2 hover:underline">
                For parents →
              </Link>
              <Link href="/how-it-works" className="text-sm font-medium text-huntly-forest underline-offset-2 hover:underline">
                How it works →
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* CTA */}
      <section className="border-t border-huntly-leaf/40 bg-huntly-leaf/20 py-14 sm:py-16">
        <div className="section text-center">
          <h2 className="font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
            Join the outdoor adventure club
          </h2>
          <p className="mt-3 text-huntly-slate">
            Huntly World — the kids adventure club UK families can actually fit into their lives.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="https://apps.apple.com/us/app/huntly-world/id6745152309"
              className="btn-primary"
            >
              Download on App Store
            </Link>
            <Link
              href="https://play.google.com/store/apps/details?id=software.fluff.huntlyclub"
              className="btn-primary"
            >
              Download on Google Play
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
