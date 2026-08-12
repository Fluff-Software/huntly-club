import type { Metadata } from "next";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import PartnersEnquiryForm from "./partners-enquiry-form";

export const metadata: Metadata = {
  title: "Partners — Bring GPS Quest Experiences to Your Attraction",
  description:
    "Turn your visitors into explorers. Huntly builds bespoke GPS-guided quest experiences for outdoor attractions — no hardware, no hassle, done-for-you setup.",
  alternates: {
    canonical: "https://huntly.world/partners",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "GPS-guided outdoor quest experiences",
  name: "Huntly for Attractions",
  provider: {
    "@type": "Organization",
    name: "Huntly",
    url: "https://huntly.world",
  },
  areaServed: "GB",
  audience: {
    "@type": "BusinessAudience",
    audienceType: "Outdoor attractions, farms and tourist sites",
  },
  description:
    "Huntly builds bespoke GPS-guided quest experiences for outdoor attractions. Families follow GPS-guided trails, discover points of interest, and complete challenges on their own phones — no hardware to install or maintain on site.",
  url: "https://huntly.world/partners",
};

const faqs = [
  {
    question: "Do we need any hardware to run a Huntly quest?",
    answer:
      "No. Huntly runs entirely on your guests' own phones, so there's nothing to install, maintain, or replace on site.",
  },
  {
    question: "Who builds the quest for our attraction?",
    answer:
      "Huntly builds a bespoke GPS-guided quest for your attraction. You simply review and approve it before it goes live.",
  },
  {
    question: "How does partnering with Huntly help our attraction?",
    answer:
      "Partners typically see repeat visits, longer dwell time, and a new revenue stream from monetising the app experience or bundling it with admission — plus data and insights into how guests move through the site.",
  },
];

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

const painPoints = [
  "Visitors leave and don't come back",
  "You can't compete with screens for kids' attention",
  "You have the space — you just need the experience layer",
];

const benefits = [
  {
    heading: "Repeat visits",
    description: "Guests come back to complete quests and try new ones.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 11A8 8 0 1 0 18.5 15.5" />
        <polyline points="20 5 20 11 14 11" />
      </svg>
    ),
  },
  {
    heading: "Longer dwell time",
    description: "Families stay longer when there's a structured adventure to follow.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 14" />
      </svg>
    ),
  },
  {
    heading: "New revenue stream",
    description: "Monetise the app experience or bundle it with admission.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 15.5c0 1 1 1.75 2.5 1.75s2.5-.6 2.5-1.6c0-2.4-5-1.15-5-3.55 0-1 1-1.6 2.5-1.6s2.5.75 2.5 1.75" />
        <line x1="12" y1="7" x2="12" y2="17" />
      </svg>
    ),
  },
  {
    heading: "Zero hardware",
    description: "Runs entirely on guests' phones — nothing to install or maintain on site.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
        <line x1="10" y1="18.2" x2="14" y2="18.2" />
      </svg>
    ),
  },
  {
    heading: "Done-for-you setup",
    description: "Huntly builds the quest. You just review and approve it.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
        <polyline points="8.5 11 10.5 13 15.5 8.5" />
      </svg>
    ),
  },
  {
    heading: "Data and insights",
    description: "See how guests move through your site and what they love most.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="20" x2="20" y2="20" />
        <rect x="6" y="13" width="3" height="7" />
        <rect x="10.5" y="8" width="3" height="12" />
        <rect x="15" y="16" width="3" height="4" />
      </svg>
    ),
  },
];

const partnerNames = ["Fairytale Farm", "Farmer Palmers", "Fairwood Lakes"];

const steps = [
  { num: "1", label: "Tell us about your attraction", short: "A few details about your site and visitors" },
  { num: "2", label: "We build your quest", short: "A bespoke GPS-guided experience, ready to review" },
  { num: "3", label: "Your visitors play, you grow", short: "Repeat visits, longer stays, happier guests" },
];

export default function PartnersPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="-mt-16 bg-brand-coral pt-28 pb-20 sm:-mt-20 sm:pt-36 sm:pb-24">
        <div className="section-wide">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Huntly for Attractions</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Turn your visitors into explorers — and bring them back again
            </h1>
            <p className="mt-5 text-xl text-white/90">
              GPS-guided quest experiences, built for outdoor attractions. No hardware. No hassle.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="#enquire" variant="light">
                Become a Quest Partner
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Sound familiar? */}
      <section className="bg-brand-cream py-16 sm:py-20">
        <div className="section-wide">
          <h2 className="mx-auto max-w-2xl text-center font-display text-2xl font-bold text-brand-green sm:text-3xl">
            Sound familiar?
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {painPoints.map((point) => (
              <Card key={point} className="text-center">
                <p className="font-display text-base font-bold text-brand-green">{point}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What is Huntly? */}
      <section className="bg-brand-beige py-16 sm:py-20">
        <div className="section-wide">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold text-brand-green sm:text-3xl">What is Huntly?</h2>
            <p className="mt-4 text-brand-muted">
              Huntly is a mobile quest app that turns your grounds into an interactive adventure. Families follow GPS-guided trails, discover points of interest, and complete challenges — all on their own phones.
            </p>
            <p className="mt-4 text-brand-muted">
              You get a bespoke quest built for your attraction. Guests get an experience they&apos;ll remember — and want to come back for.
            </p>
          </div>
        </div>
      </section>

      {/* Why partner with Huntly */}
      <section className="bg-brand-cream py-16 sm:py-20">
        <div className="section-wide text-center">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold text-brand-green sm:text-4xl">
            Why partner with Huntly?
          </h2>
          <div className="mt-10 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <Card key={benefit.heading} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-coral">
                  <span className="h-5 w-5">{benefit.icon}</span>
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-brand-green">{benefit.heading}</p>
                  <p className="mt-1 text-sm text-brand-muted">{benefit.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-brand-green py-16 sm:py-20">
        <div className="section-wide">
          <blockquote className="mx-auto max-w-2xl text-center font-display text-2xl font-bold leading-snug text-white sm:text-3xl">
            &ldquo;Huntly gives our visitors a reason to explore every corner of the farm — and families love having something structured to do together outdoors.&rdquo;
          </blockquote>
          <p className="mt-4 text-center text-white/70">— Attraction partner</p>
        </div>
      </section>

      {/* Founding partners */}
      <section className="bg-brand-cream py-16 sm:py-20">
        <div className="section-wide text-center">
          <Badge color="tan">Now onboarding founding partners for summer 2026</Badge>
          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {partnerNames.map((name) => (
              <p key={name} className="font-display text-xl font-bold text-brand-green/70">
                {name}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-brand-beige py-16 sm:py-20">
        <div className="section-wide">
          <h2 className="mb-10 text-center font-display text-2xl font-bold text-brand-green sm:text-3xl">
            How it works
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-coral font-display text-sm font-bold text-white">
                  {step.num}
                </span>
                <p className="mt-3 font-display text-base font-bold text-brand-green">{step.label}</p>
                <p className="mt-1 text-sm text-brand-muted">{step.short}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-brand-cream py-16 sm:py-20">
        <div className="section-wide">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-brand-green sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mx-auto max-w-2xl space-y-2">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-brand-tan/40 bg-white shadow-soft">
                <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-brand-green [&::-webkit-details-marker]:hidden">
                  {faq.question}
                </summary>
                <p className="border-t border-brand-tan/40 px-5 py-4 text-sm text-brand-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Enquiry form */}
      <section id="enquire" className="bg-brand-cream py-16 sm:py-20">
        <div className="section-wide">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-2xl font-bold text-brand-green sm:text-3xl">
              Ready to become a Quest Partner?
            </h2>
            <p className="mt-3 text-brand-muted">Tell us a little about your attraction and we&apos;ll be in touch.</p>
          </div>
          <Card className="mx-auto mt-8 max-w-xl">
            <PartnersEnquiryForm />
          </Card>
        </div>
      </section>
      </div>
    </>
  );
}
