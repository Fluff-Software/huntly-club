import Image from "next/image";
import Link from "next/link";
import ShowcaseSlider from "./components/ShowcaseSlider";

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

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      {/* Hero: clubhouse image with dark overlay, text at bottom */}
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
              Your club. Your missions. Outdoors.
            </h1>
            <p className="mt-3 text-lg text-white/95 drop-shadow sm:text-xl">
              Huntly World brings stories, missions and outdoor progress tracking together in one app for families, schools and clubs.
            </p>
            <div className="mt-6">
              <Link
                href="/download"
                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-huntly-moss shadow-lg transition hover:bg-huntly-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-huntly-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-white/20"
              >
                Join the club
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Meet the captains: mature team leadership */}
      <section className="section py-14 sm:py-16">
        <h2 className="mb-2 text-center font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
          Meet the team captains
        </h2>
        <p className="mb-8 text-center text-huntly-slate">
          Each team is guided by a captain to help members build confidence outdoors.
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
      </section>

      {/* App screenshot: phone mockup with real app */}
      <section className="bg-gradient-to-b from-huntly-sky/20 to-huntly-sky/10 py-14 sm:py-16">
        <div className="section">
          <h2 className="mb-2 text-center font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
            See Huntly World in action
          </h2>
          <p className="mb-10 text-center text-huntly-slate">
            A quick look at the app experience across missions, teamwork and parent updates.
          </p>
          <ShowcaseSlider slides={showcaseScreens} />
        </div>
      </section>

      {/* How it works: 3 steps, minimal text */}
      <section className="bg-gradient-to-b from-huntly-parchment to-huntly-stone/20 py-14 sm:py-16">
        <div className="section">
          <p className="mb-6 text-center text-huntly-slate">
            A place for adventures, learning, and exploring the world around you.
          </p>
          <h2 className="mb-10 text-center font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
            How it works
          </h2>
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
        </div>
      </section>

      {/* FAQ */}
      <section className="section py-14 sm:py-16">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
          Frequently asked questions
        </h2>
        <div className="mx-auto max-w-2xl space-y-2">
          <details className="group rounded-2xl border border-[var(--color-border-subtle)] bg-white/90 shadow-soft">
            <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-huntly-forest [&::-webkit-details-marker]:hidden">
              Who is Huntly World for?
            </summary>
            <p className="border-t border-[var(--color-border-subtle)] px-5 py-4 text-sm text-huntly-slate">
              Huntly World is for families, schools and clubs who want to get children outdoors, exploring and learning together. Parents can use it at home; educators and group leaders can use it with their class or club.
            </p>
          </details>
          <details className="group rounded-2xl border border-[var(--color-border-subtle)] bg-white/90 shadow-soft">
            <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-huntly-forest [&::-webkit-details-marker]:hidden">
              How do schools or clubs use it?
            </summary>
            <p className="border-t border-[var(--color-border-subtle)] px-5 py-4 text-sm text-huntly-slate">
              Schools and clubs can use Huntly World to run seasonal story and mission programmes. Members join a team, follow the story, complete missions together and track progress over time. Get in touch to discuss partnerships.
            </p>
          </details>
          <details className="group rounded-2xl border border-[var(--color-border-subtle)] bg-white/90 shadow-soft">
            <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-huntly-forest [&::-webkit-details-marker]:hidden">
              How do I get the app?
            </summary>
            <p className="border-t border-[var(--color-border-subtle)] px-5 py-4 text-sm text-huntly-slate">
              Huntly World is available on the App Store and Google Play. Contact us for the latest links or if you&apos;re interested in a pilot for your school or club.
            </p>
          </details>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-huntly-leaf/40 bg-huntly-leaf/20 py-14 sm:py-16">
        <div className="section text-center">
          <h2 className="font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
            Get in touch
          </h2>
          <p className="mt-3 text-huntly-slate">
            We’d love to hear from families, schools, clubs and community leaders.
          </p>
          <Link
            href="/contact"
            className="btn-primary mt-6 inline-flex"
          >
            Contact us
          </Link>
        </div>
      </section>
    </div>
  );
}
