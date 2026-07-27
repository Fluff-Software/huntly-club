import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Huntly World for Schools — Outdoor Learning KS2",
  description:
    "Bring structured outdoor adventure into your primary school. Huntly World supports outdoor learning for KS1 and KS2, with curriculum links to PSHE, PE and character education.",
  openGraph: {
    title: "Huntly World for Schools — Outdoor Learning KS2 | Huntly World",
    description:
      "Bring structured outdoor adventure into your primary school. Huntly World supports outdoor learning for KS1 and KS2, with curriculum links to PSHE, PE and character education.",
  },
  alternates: {
    canonical: "https://huntly.world/schools",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://huntly.world" },
    { "@type": "ListItem", position: 2, name: "For schools", item: "https://huntly.world/schools" },
  ],
};

const curriculumLinks = [
  {
    subject: "PSHE",
    points: [
      "Developing resilience, confidence and perseverance through structured outdoor challenge",
      "Exploring identity and belonging through team membership",
      "Building awareness of the natural world and responsibility to the environment",
    ],
  },
  {
    subject: "Physical Education",
    points: [
      "Encouraging regular physical activity through mission completion",
      "Developing gross motor skills through outdoor exploration",
      "Supporting active play and outdoor movement habits",
    ],
  },
  {
    subject: "Character Education",
    points: [
      "Teamwork and leadership through team structure and captain guidance",
      "Goal-setting and achievement through season progression",
      "Curiosity and independence through self-directed outdoor missions",
    ],
  },
];

export default function SchoolsPage() {
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
              {" / "}For schools
            </p>
            <h1 className="font-display text-3xl font-bold text-huntly-forest sm:text-4xl">
              Bring outdoor adventure into your school
            </h1>
            <p className="mt-4 text-huntly-slate sm:text-lg">
              Huntly World supports outdoor learning for primary-age children — with structured missions, story-driven seasons, and a team system that builds the habits of curiosity, resilience and cooperation.
            </p>
          </div>
        </div>
      </div>

      <div className="section py-12 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-14">

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              What schools use Huntly World for
            </h2>
            <p className="text-huntly-slate">
              Schools and after-school clubs use Huntly World to run structured outdoor learning programmes that complement the classroom — giving children purposeful reasons to be outside, exploring and working together.
            </p>
            <p className="mt-3 text-huntly-slate">
              Missions are designed to work in any outdoor space, including school fields and playgrounds. A teacher or activity leader reads the chapter with the class, and children complete the mission during outdoor learning time, a PE lesson, or a club session. Each mission takes around 20–45 minutes.
            </p>
            <p className="mt-3 text-huntly-slate">
              The season structure means there&apos;s a coherent arc across a half-term or full term — not a collection of one-off activities, but a genuine adventure children are part of and can talk about between sessions.
            </p>
          </div>

          <div>
            <h2 className="mb-4 font-display text-2xl font-bold text-huntly-forest">
              Curriculum links
            </h2>
            <p className="mb-6 text-huntly-slate">
              Huntly World&apos;s outdoor missions and team structure map naturally to several curriculum areas in KS1 and KS2.
            </p>
            <div className="space-y-6">
              {curriculumLinks.map((area) => (
                <div
                  key={area.subject}
                  className="rounded-2xl border border-huntly-stone/70 bg-white/90 p-5 shadow-soft"
                >
                  <p className="font-display text-lg font-bold text-huntly-forest">{area.subject}</p>
                  <ul className="mt-3 space-y-2">
                    {area.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-huntly-slate">
                        <span className="mt-0.5 shrink-0 text-huntly-moss">✓</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              How a school pilot works
            </h2>
            <p className="text-huntly-slate">
              We&apos;re currently working with a small number of schools on a pilot programme. If you&apos;re a teacher, outdoor learning coordinator, or headteacher interested in running Huntly World with your class or club, we&apos;d love to hear from you.
            </p>
            <p className="mt-3 text-huntly-slate">
              A typical school pilot runs across one half-term — covering one chapter of the current season. We provide resources for the teacher, mission guidance, and progress tracking for the whole class. Feedback from pilot schools directly shapes the product.
            </p>
            <p className="mt-3 text-huntly-slate">
              Pilot pricing is available for qualifying schools. Get in touch to discuss what that looks like for your setting.
            </p>
          </div>

          <div className="rounded-2xl border border-huntly-stone/70 bg-white/90 p-6 shadow-soft">
            <p className="font-semibold text-huntly-forest">Interested in running a pilot?</p>
            <p className="mt-1 text-sm text-huntly-slate">
              Email us at{" "}
              <a href="mailto:huntly@fluff.software" className="font-medium text-huntly-moss underline-offset-2 hover:underline">
                huntly@fluff.software
              </a>{" "}
              with a brief note about your school and what you&apos;re hoping to achieve. We&apos;ll get back to you quickly.
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <Link href="/contact" className="btn-primary">
                Get in touch
              </Link>
              <Link href="/parents" className="text-sm font-medium text-huntly-forest underline-offset-2 hover:underline self-center">
                Parent safety info →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-huntly-stone/70 bg-white/90 p-6 shadow-soft">
            <p className="font-semibold text-huntly-forest">School pricing</p>
            <p className="mt-1 text-sm text-huntly-slate">
              We offer school and group pricing for qualifying settings. See our pricing page or get in touch directly to discuss your needs.
            </p>
            <Link href="/pricing" className="mt-4 inline-block text-sm font-medium text-huntly-forest underline-offset-2 hover:underline">
              View pricing →
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
