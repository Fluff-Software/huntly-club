import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Meet the Teams — Bears, Otters, and Foxes",
  description:
    "Meet Bella, Oli, and Felix — the team captains of Huntly World's adventure club. Every child picks a team when they join. Which one are you?",
  openGraph: {
    title: "Meet the Teams — Bears, Otters, and Foxes | Huntly World",
    description:
      "Meet Bella, Oli, and Felix — the team captains of Huntly World's adventure club. Every child picks a team when they join. Which one are you?",
  },
  alternates: {
    canonical: "https://huntly.world/teams",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://huntly.world" },
    { "@type": "ListItem", position: 2, name: "Meet the teams", item: "https://huntly.world/teams" },
  ],
};

const teams = [
  {
    name: "Bears",
    captain: "Bella",
    image: "/characters/bella.png",
    colour: "bg-huntly-clay/15",
    ring: "ring-huntly-clay/45",
    accent: "text-huntly-clay",
    tagline: "Confident leadership and outdoor challenge",
    description:
      "Bella is the Bears' captain — bold, dependable, and always the first to take on a challenge. The Bears are the team for children who like to lead, who relish a tough mission, and who want to feel the satisfaction of doing something hard and doing it well. If your child is determined, competitive in a good way, or simply loves being in charge of a plan, the Bears might be calling.",
    traits: ["Leadership", "Determination", "Outdoor challenge"],
  },
  {
    name: "Foxes",
    captain: "Felix",
    image: "/characters/felix.png",
    colour: "bg-huntly-sky/15",
    ring: "ring-huntly-sky/45",
    accent: "text-huntly-slate",
    tagline: "Creative strategy and mission focus",
    description:
      "Felix leads the Foxes — clever, curious, and always thinking three steps ahead. The Foxes are the team for children who like to figure things out, find the clever solution, and notice things that others miss. If your child tends to ask why before they do anything, loves puzzles and patterns, or approaches the outdoors like it's one big mystery to solve, Felix is waiting.",
    traits: ["Curiosity", "Problem-solving", "Strategic thinking"],
  },
  {
    name: "Otters",
    captain: "Oli",
    image: "/characters/oli.png",
    colour: "bg-huntly-leaf/15",
    ring: "ring-huntly-leaf/45",
    accent: "text-huntly-moss",
    tagline: "Teamwork, resilience and momentum",
    description:
      "Oli captains the Otters — warm, encouraging, and never happier than when everyone's in it together. The Otters are the team for children who bring others along with them, who are at their best when the whole group is moving forward, and who pick themselves up and keep going when things get hard. If your child is the one who makes sure nobody gets left behind, Oli is their captain.",
    traits: ["Teamwork", "Resilience", "Encouragement"],
  },
];

export default function TeamsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="bg-huntly-stone/20 py-10 sm:py-12">
        <div className="section">
          <div className="mx-auto max-w-2xl">
            <p className="mb-2 text-sm text-huntly-slate">
              <Link href="/" className="underline-offset-2 hover:underline">Home</Link>
              {" / "}Meet the teams
            </p>
            <h1 className="font-display text-3xl font-bold text-huntly-forest sm:text-4xl">
              Meet the teams
            </h1>
            <p className="mt-4 text-huntly-slate sm:text-lg">
              Every member of the outdoor adventure club picks a team when they join. Three teams, three captains, one big world of missions to explore. Which team will your child choose?
            </p>
          </div>
        </div>
      </div>

      <div className="section py-12 sm:py-16">
        <div className="mx-auto max-w-3xl space-y-16">
          {teams.map((team) => (
            <div key={team.name} className={`rounded-3xl p-8 ring-2 ${team.colour} ${team.ring}`}>
              <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
                <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-2xl bg-huntly-parchment sm:h-56 sm:w-44">
                  <Image
                    src={team.image}
                    alt={`${team.captain}, captain of the ${team.name} team in Huntly World`}
                    fill
                    sizes="(max-width: 640px) 100vw, 176px"
                    className="object-cover object-top"
                  />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold uppercase tracking-wide ${team.accent}`}>
                    Team {team.name}
                  </p>
                  <p className="font-display text-3xl font-bold text-huntly-forest">
                    {team.captain}
                  </p>
                  <p className="mt-1 text-sm font-medium text-huntly-moss">{team.tagline}</p>
                  <p className="mt-4 text-sm leading-relaxed text-huntly-slate">
                    {team.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {team.traits.map((trait) => (
                      <span
                        key={trait}
                        className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-huntly-forest ring-1 ring-huntly-stone/60"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works link */}
      <section className="section py-8 sm:py-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-huntly-stone/70 bg-white/90 p-6 shadow-soft">
          <p className="font-semibold text-huntly-forest">Want to understand how the missions work?</p>
          <p className="mt-1 text-sm text-huntly-slate">
            Teams earn points by completing weekly outdoor missions. Find out how seasons, chapters and missions all fit together.
          </p>
          <Link href="/how-it-works" className="mt-4 inline-block text-sm font-medium text-huntly-forest underline-offset-2 hover:underline">
            See how it works →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-huntly-leaf/40 bg-huntly-leaf/20 py-14 sm:py-16">
        <div className="section text-center">
          <h2 className="font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
            Pick your team and start exploring
          </h2>
          <p className="mt-3 text-huntly-slate">
            Download Huntly World and join the kids explorer club that gets children outside.
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
