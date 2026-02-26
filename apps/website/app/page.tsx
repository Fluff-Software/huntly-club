import Image from "next/image";
import Link from "next/link";

const characters = [
  {
    name: "Bears",
    mascot: "Bella",
    tagline: "Brave and curious",
    image: "/characters/bear-wave.png",
    colour: "bg-huntly-clay/20",
    ring: "ring-huntly-clay/40",
  },
  {
    name: "Foxes",
    mascot: "Felix",
    tagline: "Quick and creative",
    image: "/characters/fox-wave.png",
    colour: "bg-huntly-sky/25",
    ring: "ring-huntly-sky/50",
  },
  {
    name: "Otters",
    mascot: "Oli",
    tagline: "Clever and playful",
    image: "/characters/otter-wave.png",
    colour: "bg-huntly-leaf/25",
    ring: "ring-huntly-leaf/50",
  },
];

const steps = [
  { num: "1", label: "Follow the story", short: "Read each season and unlock chapters", image: "/how-it-works-2.png" },
  { num: "2", label: "Head outside", short: "Do missions together", image: "/how-it-works-3.png" },
  { num: "3", label: "Celebrate!", short: "Earn achievements and see your progress", image: "/how-it-works-1.png" },
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
              Huntly World gets young explorers exploring with stories, missions and friendly characters - all in one app.
            </p>
            <div className="mt-6">
              <Link
                href="/contact"
                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-huntly-moss shadow-lg transition hover:bg-huntly-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-huntly-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-white/20"
              >
                Get in touch
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Meet the club: three characters, colourful cards */}
      <section className="section py-14 sm:py-16">
        <h2 className="mb-2 text-center font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
          Meet the club
        </h2>
        <p className="mb-8 text-center text-huntly-slate">
          Join a team and take on adventures with other explorers.
        </p>
        <div className="flex flex-wrap items-stretch justify-center gap-6">
          {characters.map((c) => (
            <div
              key={c.name}
              className={`flex w-full max-w-[240px] flex-col items-center rounded-3xl p-6 ring-2 ${c.colour} ${c.ring}`}
            >
              <div className="relative h-32 w-28">
                <Image
                  src={c.image}
                  alt={`${c.mascot} from ${c.name}, Huntly World`}
                  fill
                  sizes="112px"
                  className="object-contain"
                />
              </div>
              <p className="mt-2 font-display text-lg font-bold text-huntly-forest">
                {c.name}
              </p>
              <p className="mt-0.5 text-sm font-medium text-huntly-moss">
                Meet {c.mascot}
              </p>
              <p className="mt-1 text-center text-xs text-huntly-slate">
                {c.tagline}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* App screenshot: phone mockup with real app */}
      <section className="bg-huntly-sky/20 py-14 sm:py-16">
        <div className="section">
          <h2 className="mb-2 text-center font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
            See Huntly World in action
          </h2>
          <p className="mb-10 text-center text-huntly-slate">
            Missions, stories and achievements - all in one place for your explorers.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-14">
            <div className="relative">
              <div className="relative h-[520px] w-[260px] rounded-[2.5rem] border-8 border-huntly-forest bg-huntly-forest p-2 shadow-2xl">
                <div className="absolute left-1/2 top-5 h-6 w-24 -translate-x-1/2 rounded-full bg-huntly-forest" />
                <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] bg-huntly-parchment">
                  <Image
                    src="/app-clubhouse.png"
                    alt="Huntly World app – Clubhouse screen"
                    fill
                    sizes="260px"
                    className="object-cover object-top"
                  />
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative h-[520px] w-[260px] rounded-[2.5rem] border-8 border-huntly-forest bg-huntly-forest p-2 shadow-2xl">
                <div className="absolute left-1/2 top-5 h-6 w-24 -translate-x-1/2 rounded-full bg-huntly-forest" />
                <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] bg-huntly-parchment">
                  <Image
                    src="/app-progress.png"
                    alt="Huntly World app – progress and achievements"
                    fill
                    sizes="260px"
                    className="object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>
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
              className="flex flex-col items-center rounded-3xl bg-huntly-stone/40 p-6 text-center"
            >
              <div className="relative mb-4 h-32 w-full max-w-[200px]">
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
              Schools and clubs can use Huntly World to run seasonal story and mission programmes. Explorers join a team (Bears, Foxes or Otters), follow the story, complete missions together and see their progress. Get in touch to discuss partnerships.
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
      <section className="bg-huntly-leaf/25 py-14 sm:py-16">
        <div className="section text-center">
          <h2 className="font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
            Get in touch
          </h2>
          <p className="mt-3 text-huntly-slate">
            We’d love to hear from families, schools, clubs and young explorers.
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
