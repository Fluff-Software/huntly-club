import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For Parents — Safety, Privacy & How Huntly World Works",
  description:
    "Everything parents need to know about Huntly World — how it keeps children safe, how we handle data, what parental controls are available, and how much it costs.",
  openGraph: {
    title: "For Parents — Safety, Privacy & How Huntly World Works | Huntly World",
    description:
      "Everything parents need to know about Huntly World — how it keeps children safe, how we handle data, what parental controls are available, and how much it costs.",
  },
  alternates: {
    canonical: "https://huntly.world/parents",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://huntly.world" },
    { "@type": "ListItem", position: 2, name: "For parents", item: "https://huntly.world/parents" },
  ],
};

const faqs = [
  {
    question: "Is Huntly World safe for children?",
    answer:
      "Yes. The app contains no advertising, no in-app purchases beyond the subscription, no chat or social features, and no way for children to interact with strangers. Missions are outdoor activities designed to be completed with or near a parent or trusted adult.",
  },
  {
    question: "What data do you collect about my child?",
    answer:
      "We collect the minimum necessary to run the service — an account email address, your child's first name (so the app can address them personally), and mission progress. We do not collect location data, we do not build advertising profiles, and we never sell personal data. Full details are in our Privacy Policy.",
  },
  {
    question: "Is Huntly World GDPR compliant?",
    answer:
      "Yes. Huntly World is built and operated by Fluff Software Limited, a UK company. We comply with UK GDPR and have designed the app from the ground up with children's data protection in mind. We also follow COPPA principles for any users accessing the service from the US.",
  },
  {
    question: "Can I see what my child is doing in the app?",
    answer:
      "Yes. The app includes a parent view where you can see your child's mission progress, which team they're on, and any achievements they've earned. You can also see upcoming missions so you can plan ahead.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "The app is free to download and includes access to introductory content. A subscription unlocks the full season and all weekly missions. See our pricing page for details.",
  },
  {
    question: "What age is Huntly World for?",
    answer:
      "Huntly World is designed for children aged 4-14. Younger children will need more support from a parent to follow the story; older children in the range can engage more independently.",
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

export default function ParentsPage() {
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
              {" / "}For parents
            </p>
            <h1 className="font-display text-3xl font-bold text-huntly-forest sm:text-4xl">
              What parents need to know
            </h1>
            <p className="mt-4 text-huntly-slate sm:text-lg">
              We know you&apos;re careful about what your children use. You should be. Here&apos;s the plain-English version of how Huntly World works, what we do with your data, and why we built it the way we did.
            </p>
          </div>
        </div>
      </div>

      <div className="section py-12 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-14">

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              Is it safe?
            </h2>
            <p className="text-huntly-slate">
              Yes. Huntly World is a closed adventure club — there are no social features, no stranger interactions, no user-generated content visible to other members. Children follow a story, complete outdoor missions, and earn achievements. That&apos;s the whole app.
            </p>
            <p className="mt-3 text-huntly-slate">
              There are no ads anywhere in the app. No pop-ups, no sponsored content, no persuasive design patterns. The subscription model means we&apos;re accountable to families, not advertisers.
            </p>
            <p className="mt-3 text-huntly-slate">
              Missions take children outside, often with a parent or trusted adult nearby. The app is a guide, not a babysitter — we expect and encourage adults to be part of the adventure.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              How does data privacy work?
            </h2>
            <p className="text-huntly-slate">
              We collect the minimum we need to run the service. That&apos;s your account email, your child&apos;s first name, and mission progress. We don&apos;t collect location. We don&apos;t build advertising profiles. We don&apos;t sell personal data to anyone.
            </p>
            <p className="mt-3 text-huntly-slate">
              Huntly World is built and run by Fluff Software Limited, a UK company based in Swindon. We comply with UK GDPR, and we follow COPPA principles for users accessing the service from the US. Children&apos;s data is treated with particular care throughout.
            </p>
            <div className="mt-4">
              <Link href="/privacy" className="text-sm font-medium text-huntly-forest underline-offset-2 hover:underline">
                Read the full privacy policy →
              </Link>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              What are the parental controls?
            </h2>
            <p className="text-huntly-slate">
              The account is set up and managed by a parent. Children access the app through the family account, which the parent controls. The parent view lets you:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-huntly-slate">
              {[
                "See your child's mission progress and achievements",
                "View upcoming missions so you can plan ahead",
                "Manage the subscription",
                "Delete the account and all associated data at any time",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 text-huntly-moss">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              How much does it cost?
            </h2>
            <p className="text-huntly-slate">
              The app is free to download and gives access to introductory content. A subscription unlocks the full current season and all weekly missions. We offer monthly and annual options — annual works out significantly cheaper and suits families who want to stick with the adventure.
            </p>
            <div className="mt-4">
              <Link href="/pricing" className="text-sm font-medium text-huntly-forest underline-offset-2 hover:underline">
                See full pricing →
              </Link>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-2xl font-bold text-huntly-forest">
              COPPA &amp; GDPR compliance
            </h2>
            <p className="text-huntly-slate">
              Huntly World complies with UK GDPR as a UK-registered company. We also apply COPPA-aligned principles to any users who access the service from the United States. This means:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-huntly-slate">
              {[
                "We don't collect personal information from children under 13 without verifiable parental consent",
                "Parents can review, update or delete their child's data at any time",
                "We don't use children's data for advertising or profiling",
                "We don't share children's data with third parties for marketing purposes",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 text-huntly-moss">✓</span>
                  {item}
                </li>
              ))}
            </ul>
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

          <div className="rounded-2xl border border-huntly-stone/70 bg-white/90 p-6 shadow-soft">
            <p className="font-semibold text-huntly-forest">Still got questions?</p>
            <p className="mt-1 text-sm text-huntly-slate">
              We&apos;re a small team and we genuinely want to hear from you. Email us at{" "}
              <a href="mailto:huntly@fluff.software" className="font-medium text-huntly-moss underline-offset-2 hover:underline">
                huntly@fluff.software
              </a>{" "}
              and we&apos;ll get back to you.
            </p>
          </div>

        </div>
      </div>

      {/* CTA */}
      <section className="border-t border-huntly-leaf/40 bg-huntly-leaf/20 py-14 sm:py-16">
        <div className="section text-center">
          <h2 className="font-display text-2xl font-bold text-huntly-forest sm:text-3xl">
            Ready to give it a try?
          </h2>
          <p className="mt-3 text-huntly-slate">
            Download Huntly World and start exploring the outdoor adventure club for curious kids.
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
            <Link href="/pricing" className="font-medium text-huntly-forest underline-offset-2 hover:underline">
              See pricing first →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
