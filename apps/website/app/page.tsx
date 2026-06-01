import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ShowcaseSlider from "./components/ShowcaseSlider";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://huntly.world",
  },
};

const captains = [
  {
    name: "Bears",
    captain: "Bella",
    tagline: "Confident leadership and outdoor challenge",
    image: "/characters/bella.png",
    colour: "bg-huntly-clay/15",
    ring: "ring-huntly-clay/45",
  },
  {
    name: "Foxes",
    captain: "Felix",
    tagline: "Creative strategy and mission focus",
    image: "/characters/felix.png",
    colour: "bg-huntly-sky/15",
    ring: "ring-huntly-sky/45",
  },
  {
    name: "Otters",
    captain: "Oli",
    tagline: "Teamwork, resilience and momentum",
    image: "/characters/oli.png",
    colour: "bg-huntly-leaf/15",
    ring: "ring-huntly-leaf/45",
  },
];

const steps = [
  { num: "1", label: "Follow the story", short: "Read each season and unlock chapters", image: "/assets/follow-the-story.png" },
  { num: "2", label: "Head outside", short: "Do missions together", image: "/assets/head-outside.png" },
  { num: "3", label: "Celebrate!", short: "Earn achievements and see your progress", image: "/assets/celebrate.png" },
];

const showcaseScreens = [
  {
    title: "Join a world of adventures",
    image: "/assets/showcase-join-adventures.png",
    alt: "Huntly World clubhouse screen inviting children to join outdoor adventures",
  },
  {
    title: "Earn badges and build real-world skills",
    image: "/assets/showcase-skills-badges.png",
    alt: "Huntly World mission step screen focused on badges and skill-building",
  },
  {
    title: "Gain points and help your team",
    image: "/assets/showcase-team-points.png",
    alt: "Huntly World team selection screen showing points and team challenges",
  },
  {
    title: "Explore, learn, and have fun",
    image: "/assets/showcase-explore-learn.png",
    alt: "Huntly World adventure tracking screen for exploring and learning",
  },
  {
    title: "Parents stay in the loop",
    image: "/assets/showcase-parents-loop.png",
    alt: "Huntly World parent progress screen showing family updates and achievements",
  },
];

const faqs = [
  {
    question: "Who is Huntly World for?",
    answer:
      "Huntly World is for families, schools and clubs who want to get children aged 4-14 outdoors, exploring and learning together. Parents can use it at home; educators and group leaders can use it with their class or club.",
  },
  {
    question: "How do schools or clubs use it?",
    answer:
      "Schools and clubs can use Huntly World to run seasonal story and outdoor mission programmes. Members join a team, follow the story, complete weekly missions together and track progress over time. Get in touch to discuss partnerships.",
  },
  {
    question: "How do I get the app?",
    answer:
      "Huntly World is available on the App Store and Google Play. Download the app to join the adventure club and start your first outdoor mission today.",
  },
];

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Huntly World",
  url: "https://huntly.world",
  logo: "https://huntly.world/logo.png",
  description:
    "Huntly World is a secret outdoor adventure club for children aged 4-14. Weekly missions, story-driven seasons, and real-world challenges.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "huntly@fluff.software",
    contactType: "customer support",
  },
  sameAs: [
    "https://apps.apple.com/us/app/huntly-world/id6745152309",
    "https://play.google.com/store/apps/details?id=software.fluff.huntlyclub",
  ],
};

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Huntly World",
  operatingSystem: "iOS, Android",
  applicationCategory: "EducationalApplication",
  description:
    "An outdoor adventure club app for children aged 4-14. Weekly missions, story-driven seasons, team challenges and achievement tracking.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "GBP",
  },
  url: "https://huntly.world",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="overflow-x-hidden">
        {/* Hero */}
        <section className="relative min-h-[28rem] w-full overflow-hidden sm:min-h-[32rem] md:min-h-[36rem]">
          <div className="absolute inset-0">
            <Image
              src="/hero-clubhouse.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center"
              priority
            />
          </div>
          <div className="absolute inset-0 bg-black/50" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-10 pt-24 text-left sm:px-6 sm:pb-12 sm:pt-28 md:px-10 md:pb-14 md:pt-32 lg:px-12">
            <div className="mx-auto max-w-2xl">
              <h1 className="font-display text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl">
                The adventure club for curious kids.
              </h1>
              <p className="mt-3 text-lg text-white/95 drop-shadow sm:text-xl">
                Weekly outdoor missions. Story-driven seasons. Real-world challenges. Huntly World is the kids adventure club that gets children aged 4-14 outside and exploring.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="https://apps.apple.com/us/app/huntly-world/id6745152309"
                  className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-huntly-moss shadow-lg transition hover:bg-huntly-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-huntly-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-white/20"
                >
                  App Store
                </Link>
                <Link
                  href="https://play.google.com/store/apps/details?id=software.fluff.huntlyclub"
                  className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-huntly-moss shadow-lg transition hover:bg-huntly-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-huntly-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-white/20"
                >
                  Google Play
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* What is Huntly World? */}
        <section className="section py-14 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
              What is Huntly World?
            </h2>
            <p className="text-huntly-slate">
              Huntly World is an outdoor adventure club for children aged 4-14. Each season unfolds a new story — and with it, a set of weekly missions that take kids outside to explore, discover, and complete real-world challenges. It&apos;s screen-free adventure that actually happens outdoors, guided by three beloved team captains: Bella of the Bears, Felix of the Foxes, and Oli of the Otters.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link href="/how-it-works" className="btn-primary">
                See how it works
              </Link>
              <Link href="/pricing" className="btn-secondary rounded-full border border-huntly-forest px-5 py-2.5 text-sm font-semibold text-huntly-forest transition hover:bg-huntly-forest hover:text-white">
                View pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Choose your team */}
        <section className="section py-14 sm:py-16">
          <h2 className="mb-2 text-center font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
            Choose your team — Bears, Otters, or Foxes
          </h2>
          <p className="mb-8 text-center text-huntly-slate">
            Every member picks a team. Each team is guided by a captain who helps young explorers build confidence outdoors.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {captains.map((c) => (
              <div
                key={c.name}
                className={`flex flex-col rounded-3xl p-6 ring-2 ${c.colour} ${c.ring}`}
              >
                <div className="relative mb-4 h-56 w-full overflow-hidden rounded-2xl bg-huntly-parchment">
                  <Image
                    src={c.image}
                    alt={`${c.captain}, captain of the ${c.name} team`}
                    fill
                    sizes="(max-width: 768px) 100vw, 30vw"
                    className="object-cover object-top"
                  />
                </div>
                <p className="font-display text-2xl font-bold text-huntly-forest">
                  {c.captain}
                </p>
                <p className="mt-1 text-sm font-medium text-huntly-moss">{c.name} Team</p>
                <p className="mt-3 text-sm text-huntly-slate">
                  {c.tagline}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/teams" className="text-sm font-medium text-huntly-forest underline-offset-2 hover:underline">
              Meet the teams in full →
            </Link>
          </div>
        </section>

        {/* App showcase */}
        <section className="bg-gradient-to-b from-huntly-sky/20 to-huntly-sky/10 py-14 sm:py-16">
          <div className="section">
            <h2 className="mb-2 text-center font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
              See Huntly World in action
            </h2>
            <p className="mb-10 text-center text-huntly-slate">
              A quick look at the adventure app for children — missions, teamwork and parent updates.
            </p>
            <ShowcaseSlider slides={showcaseScreens} />
          </div>
        </section>

        {/* How the club works */}
        <section className="bg-gradient-to-b from-huntly-parchment to-huntly-stone/20 py-14 sm:py-16">
          <div className="section">
            <h2 className="mb-2 text-center font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
              How the club works
            </h2>
            <p className="mb-10 text-center text-huntly-slate">
              Each outdoor adventure follows a simple structure — so kids always know what&apos;s coming next, and parents always know what to expect.
            </p>
            <div className="grid gap-8 sm:grid-cols-3">
              {steps.map((step) => (
                <div
                  key={step.num}
                  className="flex flex-col items-center rounded-3xl border border-huntly-stone/70 bg-white/95 p-6 text-center shadow-soft"
                >
                  <div className="relative mb-4 aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl bg-white p-2">
                    <Image
                      src={step.image}
                      alt={step.label}
                      fill
                      sizes="(max-width: 768px) 200px, 200px"
                      className="object-contain"
                    />
                  </div>
                  <p className="font-display text-lg font-bold text-huntly-forest">
                    {step.label}
                  </p>
                  <p className="mt-1 text-sm text-huntly-slate">{step.short}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/how-it-works" className="btn-primary">
                See the full picture
              </Link>
            </div>
          </div>
        </section>

        {/* What parents say */}
        <section className="section py-14 sm:py-16">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
            What parents say
          </h2>
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {[
              {
                quote: "My kids actually ask to go outside now. That's never happened before.",
                author: "Parent of two, aged 6 and 9",
              },
              {
                quote: "The missions are clever — they feel like a game but it's all happening in the real world.",
                author: "Parent, Swindon",
              },
              {
                quote: "I love that there are no ads and no creepy data stuff. It just works.",
                author: "Parent of a 7-year-old",
              },
            ].map((t) => (
              <blockquote
                key={t.author}
                className="flex flex-col rounded-2xl border border-huntly-stone/70 bg-white/90 p-6 shadow-soft"
              >
                <p className="flex-1 text-sm italic text-huntly-slate">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 text-xs font-semibold text-huntly-moss">{t.author}</footer>
              </blockquote>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-huntly-slate/70">
            Placeholder quotes — replace with real parent reviews when available.
          </p>
        </section>

        {/* Safe, simple, and built in the UK */}
        <section className="bg-huntly-forest py-14 sm:py-16">
          <div className="section">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-white sm:text-3xl">
              Safe, simple, and built in the UK
            </h2>
            <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">
              {[
                {
                  heading: "No ads. Ever.",
                  body: "Huntly World is subscription-supported. We don't carry ads and we never will.",
                },
                {
                  heading: "Your data stays yours.",
                  body: "We don't sell personal data. Full GDPR and COPPA compliance, built in from day one.",
                },
                {
                  heading: "Made in Swindon, UK.",
                  body: "Huntly is built and run by a small team at Fluff Software Limited. Real people, real accountability.",
                },
              ].map((item) => (
                <div key={item.heading} className="rounded-2xl bg-white/10 p-6 text-white">
                  <p className="font-display text-lg font-bold">{item.heading}</p>
                  <p className="mt-2 text-sm text-white/80">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/parents" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-huntly-forest shadow-lg transition hover:bg-huntly-parchment">
                Read the full parent guide
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section py-14 sm:py-16">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mx-auto max-w-2xl space-y-2">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-[var(--color-border-subtle)] bg-white/90 shadow-soft"
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
        </section>

        {/* Final CTA */}
        <section className="border-t border-huntly-leaf/40 bg-huntly-leaf/20 py-14 sm:py-16">
          <div className="section text-center">
            <h2 className="font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
              Ready to join the club?
            </h2>
            <p className="mt-3 text-huntly-slate">
              Download Huntly World and start your first outdoor mission today.
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
              Or{" "}
              <Link href="/contact" className="font-medium text-huntly-forest underline-offset-2 hover:underline">
                get in touch
              </Link>{" "}
              if you&apos;re a school or club.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
