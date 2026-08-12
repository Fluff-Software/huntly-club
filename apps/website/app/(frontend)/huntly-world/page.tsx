import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ShowcaseSlider from "../components/ShowcaseSlider";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import IconChip from "../components/ui/IconChip";

export const metadata: Metadata = {
  title: "Huntly World — The Outdoor Adventure Club for Curious Kids",
  description:
    "Huntly World is a secret adventure club for children aged 4-14. Weekly outdoor missions, story-driven seasons, and real-world challenges — led by Bella, Felix and Oli. Join the club.",
  alternates: {
    canonical: "https://huntly.world/huntly-world",
  },
};

const captains = [
  {
    name: "Bears",
    captain: "Bella",
    tagline: "Confident leadership and outdoor challenge",
    image: "/characters/bella.png",
  },
  {
    name: "Foxes",
    captain: "Felix",
    tagline: "Creative strategy and mission focus",
    image: "/characters/felix.png",
  },
  {
    name: "Otters",
    captain: "Oli",
    tagline: "Teamwork, resilience and momentum",
    image: "/characters/oli.png",
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

const testimonials = [
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
  url: "https://huntly.world/huntly-world",
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

export default function HuntlyWorldPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="overflow-x-hidden">
        {/* Hero */}
        <section className="relative -mt-16 min-h-[28rem] w-full overflow-hidden sm:-mt-20 sm:min-h-[32rem] md:min-h-[36rem]">
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
          <div className="absolute inset-0 bg-brand-green/60" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-10 pt-24 text-left sm:px-6 sm:pb-12 sm:pt-28 md:px-10 md:pb-14 md:pt-32 lg:px-12">
            <div className="mx-auto max-w-2xl">
              <Badge color="gold">Huntly World</Badge>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl">
                The adventure club for curious kids.
              </h1>
              <p className="mt-3 text-lg text-white/95 drop-shadow sm:text-xl">
                Weekly outdoor missions. Story-driven seasons. Real-world challenges. Huntly World is the kids adventure club that gets children aged 4-14 outside and exploring.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href="https://apps.apple.com/us/app/huntly-world/id6745152309" variant="primary">
                  App Store
                </Button>
                <Button href="https://play.google.com/store/apps/details?id=software.fluff.huntlyclub" variant="primary">
                  Google Play
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* What is Huntly World? */}
        <section className="section-wide py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-brand-green sm:text-3xl">
              What is Huntly World?
            </h2>
            <p className="text-brand-muted">
              Huntly World is an outdoor adventure club for children aged 4-14. Each season unfolds a new story — and with it, a set of weekly missions that take kids outside to explore, discover, and complete real-world challenges. It&apos;s screen-free adventure that actually happens outdoors, guided by three beloved team captains: Bella of the Bears, Felix of the Foxes, and Oli of the Otters.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Button href="/how-it-works" variant="dark">
                See how it works
              </Button>
              <Button href="/pricing" variant="outline">
                View pricing
              </Button>
            </div>
          </div>
        </section>

        {/* Choose your team */}
        <section className="bg-brand-beige py-16 sm:py-20">
          <div className="section-wide">
            <h2 className="mb-2 text-center font-display text-2xl font-bold text-brand-green sm:text-3xl">
              Choose your team — Bears, Otters, or Foxes
            </h2>
            <p className="mb-8 text-center text-brand-muted">
              Every member picks a team. Each team is guided by a captain who helps young explorers build confidence outdoors.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {captains.map((c) => (
                <Card key={c.name} className="p-0">
                  <div className="relative h-56 w-full overflow-hidden rounded-t-3xl bg-brand-cream">
                    <Image
                      src={c.image}
                      alt={`${c.captain}, captain of the ${c.name} team`}
                      fill
                      sizes="(max-width: 768px) 100vw, 30vw"
                      className="object-cover object-top"
                    />
                  </div>
                  <div className="p-6">
                    <p className="font-display text-2xl font-bold text-brand-green">{c.captain}</p>
                    <p className="mt-1 text-sm font-medium text-brand-teal">{c.name} Team</p>
                    <p className="mt-3 text-sm text-brand-muted">{c.tagline}</p>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/teams" className="text-sm font-medium text-brand-green underline-offset-2 hover:underline">
                Meet the teams in full →
              </Link>
            </div>
          </div>
        </section>

        {/* App showcase */}
        <section className="section-wide py-16 sm:py-20">
          <h2 className="mb-2 text-center font-display text-2xl font-bold text-brand-green sm:text-3xl">
            See Huntly World in action
          </h2>
          <p className="mb-10 text-center text-brand-muted">
            A quick look at the adventure app for children — missions, teamwork and parent updates.
          </p>
          <ShowcaseSlider slides={showcaseScreens} />
        </section>

        {/* How the club works */}
        <section className="bg-brand-beige py-16 sm:py-20">
          <div className="section-wide">
            <h2 className="mb-2 text-center font-display text-2xl font-bold text-brand-green sm:text-3xl">
              How the club works
            </h2>
            <p className="mb-10 text-center text-brand-muted">
              Each outdoor adventure follows a simple structure — so kids always know what&apos;s coming next, and parents always know what to expect.
            </p>
            <div className="grid gap-8 sm:grid-cols-3">
              {steps.map((step) => (
                <Card key={step.num} className="flex flex-col items-center text-center">
                  <div className="relative mb-4 aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl bg-brand-cream p-2">
                    <Image
                      src={step.image}
                      alt={step.label}
                      fill
                      sizes="(max-width: 768px) 200px, 200px"
                      className="object-contain"
                    />
                  </div>
                  <p className="font-display text-lg font-bold text-brand-green">{step.label}</p>
                  <p className="mt-1 text-sm text-brand-muted">{step.short}</p>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button href="/how-it-works" variant="dark">
                See the full picture
              </Button>
            </div>
          </div>
        </section>

        {/* What parents say */}
        <section className="section-wide py-16 sm:py-20">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-brand-green sm:text-3xl">
            What parents say
          </h2>
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.author} className="flex flex-col">
                <p className="flex-1 text-sm italic text-brand-muted">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 text-xs font-semibold text-brand-teal">{t.author}</footer>
              </Card>
            ))}
          </div>
        </section>

        {/* Safe, simple, and built in the UK */}
        <section className="bg-brand-green py-16 sm:py-20">
          <div className="section-wide">
            <h2 className="mb-8 text-center font-display text-2xl font-bold text-white sm:text-3xl">
              Safe, simple, and built in the UK
            </h2>
            <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">
              {[
                { icon: "pink" as const, heading: "No ads. Ever.", body: "Huntly World is subscription-supported. We don't carry ads and we never will." },
                { icon: "teal" as const, heading: "Your data stays yours.", body: "We don't sell personal data. Full GDPR and COPPA compliance, built in from day one." },
                { icon: "gold" as const, heading: "Made in Swindon, UK.", body: "Huntly is built and run by a small team at Fluff Software Limited. Real people, real accountability." },
              ].map((item) => (
                <div key={item.heading} className="rounded-2xl bg-white/10 p-6 text-white">
                  <IconChip color={item.icon} />
                  <p className="mt-4 font-display text-lg font-bold">{item.heading}</p>
                  <p className="mt-2 text-sm text-white/80">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button href="/parents" variant="primary">
                Read the full parent guide
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-wide py-16 sm:py-20">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-brand-green sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mx-auto max-w-2xl space-y-2">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-brand-tan/40 bg-white shadow-soft"
              >
                <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-brand-green [&::-webkit-details-marker]:hidden">
                  {faq.question}
                </summary>
                <p className="border-t border-brand-tan/40 px-5 py-4 text-sm text-brand-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-brand-teal/30 bg-brand-teal/10 py-16 sm:py-20">
          <div className="section-wide text-center">
            <h2 className="font-display text-2xl font-bold text-brand-green sm:text-3xl">
              Ready to join the club?
            </h2>
            <p className="mt-3 text-brand-muted">Download Huntly World and start your first outdoor mission today.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button href="https://apps.apple.com/us/app/huntly-world/id6745152309" variant="dark">
                Download on App Store
              </Button>
              <Button href="https://play.google.com/store/apps/details?id=software.fluff.huntlyclub" variant="dark">
                Download on Google Play
              </Button>
            </div>
            <p className="mt-4 text-sm text-brand-muted">
              Or{" "}
              <Link href="/contact" className="font-medium text-brand-green underline-offset-2 hover:underline">
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
