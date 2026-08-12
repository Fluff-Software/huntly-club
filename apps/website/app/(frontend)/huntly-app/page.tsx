import type { Metadata } from "next";
import Link from "next/link";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

export const metadata: Metadata = {
  title: "Huntly — The Outdoor Adventure App for Kids",
  description:
    "Huntly is an innovative app designed to inspire children to explore the great outdoors while learning and having fun. Interactive quests, no ads, no in-app purchases.",
  alternates: {
    canonical: "https://huntly.world/huntly-app",
  },
};

const APP_STORE_URL = "https://apps.apple.com/app/id6448391328";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=software.fluff.huntly";

const features = [
  {
    heading: "Exciting Quests",
    description: "Choose from a diverse range of quests, from finding shapes in nature to embarking on a magical garden adventure.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polygon points="12 7 14 11 18 12 14 13 12 17 10 13 6 12 10 11" />
      </svg>
    ),
  },
  {
    heading: "Educational and Fun",
    description: "Huntly combines the thrill of exploration with educational elements, making learning a fun and engaging experience.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5 C6 4.5 9 4.5 12 6 C15 4.5 18 4.5 20 5.5 V18 C18 17 15 17 12 18.5 C9 17 6 17 4 18 Z" />
        <line x1="12" y1="6" x2="12" y2="18.5" />
      </svg>
    ),
  },
  {
    heading: "Easy to Use",
    description: "Our intuitive interface is designed for children, ensuring they can easily navigate and enjoy the app.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
        <line x1="10" y1="18.2" x2="14" y2="18.2" />
      </svg>
    ),
  },
  {
    heading: "Safe and Secure",
    description: "We prioritise your child's safety, and our app contains no ads or in-app purchases, so you can have peace of mind.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.5 L19.5 5.5 V11.5 C19.5 16.5 16.2 20 12 21.5 C7.8 20 4.5 16.5 4.5 11.5 V5.5 Z" />
        <polyline points="8.5 12 10.75 14.25 15.5 9.5" />
      </svg>
    ),
  },
];

const testimonials = [
  { quote: "I loved it, I wanted to look for more things so that I could earn more badges!", author: "Ruth, 13" },
  { quote: "A great learning tool, and it's lovely to see my son's words develop through the use of this app.", author: "Rebecca, Mum" },
  { quote: "This is adventurous and gets you out exploring, and is FUN!!", author: "Billie-May, 10" },
];

const steps = [
  { num: "1", label: "Download Huntly", short: "Get the app from the App Store or Google Play" },
  { num: "2", label: "Select a quest", short: "Pick something that sparks your child's curiosity" },
  { num: "3", label: "Head outdoors", short: "Start exploring together" },
  { num: "4", label: "Earn badges", short: "Complete quests and celebrate the wins" },
];

const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Huntly",
  operatingSystem: "iOS, Android",
  applicationCategory: "EducationalApplication",
  description:
    "The ultimate outdoor adventure app for kids. Interactive quests that encourage children to discover nature, learn about wildlife, and develop problem-solving skills.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "GBP",
  },
  url: "https://huntly.world/huntly-app",
};

export default function HuntlyAppPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />

      <div className="overflow-x-hidden">
        {/* Hero */}
        <section className="-mt-16 bg-brand-coral pt-28 pb-20 sm:-mt-20 sm:pt-36 sm:pb-24">
          <div className="section-wide">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Huntly</p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                The Ultimate Outdoor Adventure App for Kids
              </h1>
              <p className="mt-5 text-xl text-white/90">
                Engage your child&apos;s curiosity and love for the outdoors with our fun and educational quests.
              </p>
              <p className="mt-4 text-white/75">
                Huntly is an innovative app designed to inspire children to explore the great outdoors while learning and having fun. Our app offers a wide variety of interactive quests that encourage kids to discover the beauty of nature, learn about wildlife, and develop essential problem-solving skills.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button href={APP_STORE_URL} variant="light">
                  App Store
                </Button>
                <Button href={PLAY_STORE_URL} variant="light">
                  Google Play
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-brand-cream py-16 sm:py-20">
          <div className="section-wide text-center">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold text-brand-green sm:text-4xl">
              Features
            </h2>
            <div className="mt-10 grid gap-6 text-left sm:grid-cols-2">
              {features.map((feature) => (
                <Card key={feature.heading} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-coral">
                    <span className="h-5 w-5">{feature.icon}</span>
                  </span>
                  <div>
                    <p className="font-display text-lg font-bold text-brand-green">{feature.heading}</p>
                    <p className="mt-1 text-sm text-brand-muted">{feature.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-brand-beige py-16 sm:py-20">
          <div className="section-wide">
            <h2 className="mb-10 text-center font-display text-2xl font-bold text-brand-green sm:text-3xl">
              Loved by children (and parents!)
            </h2>
            <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.author} className="flex flex-col bg-white">
                  <p className="flex-1 text-sm italic text-brand-muted">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-4 text-xs font-semibold text-brand-coral">{t.author}</footer>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-brand-cream py-16 sm:py-20">
          <div className="section-wide">
            <h2 className="mb-10 text-center font-display text-2xl font-bold text-brand-green sm:text-3xl">
              How it works
            </h2>
            <div className="grid gap-6 sm:grid-cols-4">
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

        {/* Final CTA */}
        <section className="border-t border-brand-coral/20 bg-brand-coral/10 py-16 sm:py-20">
          <div className="section-wide text-center">
            <h2 className="font-display text-2xl font-bold text-brand-green sm:text-3xl">Get started!</h2>
            <p className="mt-3 text-brand-muted">Download Huntly and start your first quest today.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button href={APP_STORE_URL} variant="primary">
                Download on App Store
              </Button>
              <Button href={PLAY_STORE_URL} variant="primary">
                Download on Google Play
              </Button>
            </div>
            <p className="mt-4 text-sm text-brand-muted">
              Or{" "}
              <Link href="/huntly-world" className="font-medium text-brand-green underline-offset-2 hover:underline">
                explore Huntly World
              </Link>{" "}
              — the seasonal adventure club.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
