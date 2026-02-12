import Image from "next/image";
import Link from "next/link";

const characters = [
  {
    name: "Bear",
    image: "/characters/bear-wave.png",
    colour: "bg-huntly-clay/20",
    ring: "ring-huntly-clay/40",
  },
  {
    name: "Fox",
    image: "/characters/fox-wave.png",
    colour: "bg-huntly-sky/25",
    ring: "ring-huntly-sky/50",
  },
  {
    name: "Otter",
    image: "/characters/otter-wave.png",
    colour: "bg-huntly-leaf/25",
    ring: "ring-huntly-leaf/50",
  },
];

const steps = [
  { num: "1", label: "Pick your pack", short: "Choose a story and missions" },
  { num: "2", label: "Head outside", short: "Do missions together" },
  { num: "3", label: "Celebrate!", short: "Earn badges and see your progress" },
];

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      {/* Hero: playful, one character, bold colours, minimal text */}
      <section className="relative bg-huntly-moss px-4 pt-10 pb-16 sm:px-6 sm:pt-14 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-8 text-center md:flex-row md:items-end md:justify-between md:text-left">
            <div className="space-y-5 md:max-w-xl">
              <h1 className="font-display text-3xl font-bold tracking-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl">
                Your club. Your missions. Outdoors.
              </h1>
              <p className="text-lg text-white/90">
                Huntly World gets kids exploring with stories, missions and friendly characters — all in one app.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
                <Link
                  href="/contact"
                  className="inline-flex cursor-pointer items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-huntly-moss shadow-lg transition hover:bg-huntly-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-huntly-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-huntly-moss"
                >
                  Get in touch
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex cursor-pointer items-center justify-center rounded-full border-2 border-white/80 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-huntly-moss"
                >
                  Find out more
                </Link>
              </div>
            </div>
            <div className="relative h-48 w-44 shrink-0 md:h-56 md:w-52">
                <Image
                  src="/characters/bear-wave.png"
                  alt="Bear from Huntly World waving hello"
                  fill
                  sizes="(max-width: 768px) 176px, 208px"
                  className="object-contain object-bottom drop-shadow-lg"
                  priority
                />
            </div>
          </div>
        </div>
      </section>

      {/* Meet the club: three characters, colourful cards */}
      <section className="section py-14 sm:py-16">
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
          Meet the club
        </h2>
        <div className="flex flex-wrap items-stretch justify-center gap-6">
          {characters.map((c) => (
            <div
              key={c.name}
              className={`flex w-full max-w-[240px] flex-col items-center rounded-3xl p-6 ring-2 ${c.colour} ${c.ring}`}
            >
              <div className="relative h-32 w-28">
                <Image
                  src={c.image}
                  alt={`${c.name} from Huntly World`}
                  fill
                  sizes="112px"
                  className="object-contain"
                />
              </div>
              <p className="mt-2 font-display text-lg font-bold text-huntly-forest">
                {c.name}
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
            Missions, stories and achievements — all in one place.
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
      <section className="section py-14 sm:py-16">
        <h2 className="mb-10 text-center font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
          How it works
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="flex flex-col items-center rounded-3xl bg-huntly-stone/40 p-6 text-center"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-huntly-moss text-xl font-bold text-white">
                {step.num}
              </div>
              <p className="font-display text-lg font-bold text-huntly-forest">
                {step.label}
              </p>
              <p className="mt-1 text-sm text-huntly-slate">{step.short}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-huntly-leaf/25 py-14 sm:py-16">
        <div className="section text-center">
          <h2 className="font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
            Questions? Get in touch
          </h2>
          <p className="mt-3 text-huntly-slate">
            We’d love to hear from families, schools and clubs.
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
