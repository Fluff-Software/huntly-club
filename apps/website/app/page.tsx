import Image from "next/image";
import Link from "next/link";

const steps = [
  {
    title: "Pick a quest",
    description:
      "Choose from playful, story-led missions that invite kids to spot shapes in leaves, listen for birds, or design habitats for mini beasts.",
  },
  {
    title: "Head outdoors together",
    description:
      "Follow gentle prompts that build curiosity, vocabulary, and confidence – with just enough screen to guide, not distract.",
  },
  {
    title: "Reflect & celebrate",
    description:
      "Kids capture what they noticed in their own words and photos, earning calm, satisfying badges for their efforts.",
  },
];

const highlights = [
  {
    title: "Curiosity-first design",
    description:
      "Narrated prompts, child-friendly language, and open-ended tasks help children lead the adventure.",
  },
  {
    title: "Screen-light, world-heavy",
    description:
      "The app nudges families outside, then gets out of the way so kids can move, explore and play.",
  },
  {
    title: "Loved by kids and parents",
    description:
      "“This is adventurous and gets you out exploring, and is FUN!!” – Billie-May, 10",
  },
];

export default function HomePage() {
  return (
    <div className="bg-gradient-to-b from-huntly-sky/20 to-huntly-parchment">
      <section className="section pb-16 pt-10 sm:pt-14">
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full bg-huntly-leaf/10 px-3 py-1 text-xs font-semibold text-huntly-forest ring-1 ring-huntly-leaf/30">
              Huntly Club · Outdoor quests for curious kids
            </span>

            <h1 className="max-w-xl font-display text-3xl font-semibold tracking-tight text-huntly-forest sm:text-4xl md:text-[2.8rem] md:leading-tight">
              Gentle, story-led adventures that get kids outside and noticing
              the world.
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
              Huntly Club is an outdoor adventure app for kids. Each quest
              invites children to explore nature, look closely, and capture
              what they discover – building language, confidence and a lifelong
              love of the outdoors.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="https://www.huntly.app/"
                className="btn-primary"
              >
                Learn more about the Huntly app
              </Link>
              <Link
                href="/contact"
                className="btn-ghost"
              >
                Talk to us about Huntly Club
              </Link>
            </div>

            <dl className="mt-4 grid gap-3 text-xs text-[var(--color-text-muted)] sm:grid-cols-3 sm:text-sm">
              <div>
                <dt className="font-semibold text-huntly-forest">
                  Designed for families
                </dt>
                <dd>Simple, child-friendly interface with no ads.</dd>
              </div>
              <div>
                <dt className="font-semibold text-huntly-forest">
                  Built with educators
                </dt>
                <dd>Quests that grow vocabulary and problem-solving.</dd>
              </div>
              <div>
                <dt className="font-semibold text-huntly-forest">
                  Outdoors at the centre
                </dt>
                <dd>Nature-first, not screen-first.</dd>
              </div>
            </dl>
          </div>

          <div className="relative mx-auto flex max-w-md items-center justify-center md:max-w-none">
            <div className="relative w-full max-w-sm rounded-[2.25rem] border border-huntly-stone/70 bg-white/90 p-5 shadow-soft backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-huntly-moss/10">
                  <Image
                    src="/logo.png"
                    alt="Huntly Club"
                    fill
                    sizes="40px"
                    className="object-contain p-1.5"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-huntly-forest">
                    Huntly World
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    “I wanted to look for more things so that I could earn more
                    badges!” – Ruth, 13
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 rounded-2xl bg-huntly-parchment/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-huntly-slate">
                  Today&apos;s quest
                </p>
                <h2 className="font-display text-lg font-semibold text-huntly-forest">
                  Secret Shapes in the Garden
                </h2>
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                  Can you spot circles, triangles and spirals hiding in leaves,
                  stones and shadows? Take a picture of your favourite find and
                  tell Huntly what you noticed.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="inline-flex rounded-full bg-huntly-leaf/15 px-3 py-1 text-[11px] font-medium text-huntly-forest">
                    20–30 mins outdoors
                  </span>
                  <span className="inline-flex rounded-full bg-huntly-sky/15 px-3 py-1 text-[11px] font-medium text-huntly-slate">
                    Age 6–11
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-white/90 px-4 py-3 text-[11px] text-[var(--color-text-muted)] ring-1 ring-huntly-stone/80">
                <span>Earn the <span className="font-semibold text-huntly-forest">Pattern Spotter</span> badge</span>
                <span className="inline-flex h-7 items-center rounded-full bg-huntly-ochre/20 px-3 text-[11px] font-semibold text-huntly-forest">
                  Gentle celebration ✶
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section pb-14">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="card space-y-4">
            <h2 className="font-display text-xl font-semibold text-huntly-forest">
              What is Huntly Club?
            </h2>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              Huntly Club is a gentle companion for families who want kids to
              spend more time outdoors. Through calm, character-led quests,
              children are invited to notice tiny details, ask questions and
              record their ideas in their own words.
            </p>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              There are no leaderboards or loud rewards – just thoughtful badges
              that quietly celebrate effort, care and curiosity.
            </p>
          </div>

          <div className="card space-y-5">
            <h2 className="font-display text-xl font-semibold text-huntly-forest">
              How it works
            </h2>
            <ol className="space-y-3 text-sm text-[var(--color-text-muted)]">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-huntly-moss text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-huntly-forest">
                      {step.title}
                    </p>
                    <p className="text-xs sm:text-[13px]">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <article key={item.title} className="card space-y-3">
              <h3 className="font-display text-base font-semibold text-huntly-forest">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

