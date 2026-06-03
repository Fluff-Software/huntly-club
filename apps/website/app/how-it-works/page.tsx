import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How Huntly World Works — Seasons, Chapters & Outdoor Missions",
  description:
    "Huntly World is built around seasons, chapters, and weekly outdoor missions for children aged 4-14. Here's exactly how the adventure club works.",
  openGraph: {
    title: "How Huntly World Works — Seasons, Chapters & Outdoor Missions",
    description:
      "Huntly World is built around seasons, chapters, and weekly outdoor missions for children aged 4-14. Here's exactly how the adventure club works.",
  },
  alternates: {
    canonical: "https://huntly.world/how-it-works",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://huntly.world" },
    { "@type": "ListItem", position: 2, name: "How it works", item: "https://huntly.world/how-it-works" },
  ],
};

const faqs = [
  {
    question: "How often do new missions come out?",
    answer:
      "New missions are released weekly, following the current chapter in the season's story. Each mission is designed to be completed outside, in around 20–45 minutes.",
  },
  {
    question: "Do children need to do missions in order?",
    answer:
      "Missions follow the chapter story, so doing them in order gives the fullest experience. But families can go at their own pace — there's no penalty for taking a break.",
  },
  {
    question: "How many teams are there?",
    answer:
      "There are three teams: Bears, Otters, and Foxes. Each is led by a character captain — Bella, Oli, and Felix. Members pick a team when they join and earn points for their team by completing missions.",
  },
  {
    question: "Can more than one child use the same account?",
    answer:
      "Yes — Huntly World is designed for families. Multiple children can use a single family account and still track their own progress.",
  },
  {
    question: "Do children need internet access while doing missions?",
    answer:
      "No. Missions are designed to be completed outdoors. The app loads the mission details beforehand, so children can head outside without needing a signal.",
  },
  {
    question: "Is there a minimum age?",
    answer:
      "Huntly World is designed for children aged 4-14. Younger children will need a grown-up to help with the app; older children can follow missions more independently.",
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

export default function HowItWorksPage() {
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
              {" / "}How it works
            </p>
            <h1 className="font-display text-3xl font-bold text-huntly-forest sm:text-4xl">
              How Huntly World works
            </h1>
            <p className="mt-4 text-huntly-slate sm:text-lg">
              Huntly World is a kids adventure club built around outdoor missions, story-driven seasons and real team challenges. Here&apos;s how it all fits together.
            </p>
          </div>
        </div>
      </div>

      <div className="section py-12 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-14">

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              What&apos;s a season?
            </h2>
            <p className="text-huntly-slate">
              Each season is a story arc that unfolds over several weeks. It might be a lost map, a mysterious signal from the forest, or a challenge that only the teams can solve together. Seasons give the adventure a beginning, middle and end — so there&apos;s always something to look forward to, and a proper sense of completion when it&apos;s done.
            </p>
            <p className="mt-3 text-huntly-slate">
              New seasons launch regularly. Families who join mid-season can catch up, or simply wait for the next one to begin fresh.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              What&apos;s a chapter?
            </h2>
            <p className="text-huntly-slate">
              Each season is divided into chapters — shorter story beats that last a week or two. Think of them like episodes. At the start of each chapter, children find out what&apos;s happening next in the story, and what kind of outdoor mission they&apos;ll be doing.
            </p>
            <p className="mt-3 text-huntly-slate">
              Chapters are designed to be self-contained enough that busy families can pick them up without feeling lost, but connected enough to reward those who follow from the beginning.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              What&apos;s a mission?
            </h2>
            <p className="text-huntly-slate">
              A mission is the outdoor bit — the part that actually happens in the real world. Missions are released weekly and take children outside to explore, discover, and complete challenges tied to the chapter&apos;s story. That might mean finding clues in the park, observing nature, building something with materials they find, or working together as a team.
            </p>
            <p className="mt-3 text-huntly-slate">
              Missions are designed to take around 20–45 minutes and work in any outdoor space — a garden, local park, woods, or playing field. No specialist equipment needed.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              How do teams work?
            </h2>
            <p className="text-huntly-slate">
              When a child joins Huntly World, they pick one of three teams: Bears, Otters, or Foxes. Each team has a captain character who narrates the adventure and cheers them on — Bella leads the Bears, Oli leads the Otters, and Felix leads the Foxes.
            </p>
            <p className="mt-3 text-huntly-slate">
              Completing missions earns points for your team. Points accumulate across the season and contribute to the story&apos;s outcome. It&apos;s friendly competition — the kind that motivates without pressure.
            </p>
            <div className="mt-4">
              <Link href="/teams" className="text-sm font-medium text-huntly-forest underline-offset-2 hover:underline">
                Meet the team captains →
              </Link>
            </div>
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

        </div>
      </div>

      {/* CTA */}
      <section className="border-t border-huntly-leaf/40 bg-huntly-leaf/20 py-14 sm:py-16">
        <div className="section text-center">
          <h2 className="font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
            Ready to start your first mission?
          </h2>
          <p className="mt-3 text-huntly-slate">
            Download Huntly World and join the outdoor adventure club for curious kids.
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
          <p className="mt-4 text-sm text-huntly-slate">
            Want to understand the costs?{" "}
            <Link href="/pricing" className="font-medium text-huntly-forest underline-offset-2 hover:underline">
              See pricing →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
