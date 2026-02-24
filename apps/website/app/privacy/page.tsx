import type { ReactNode } from "react";

export const metadata = {
  title: "Privacy Policy · Huntly World",
  description:
    "How Fluff Software Limited collects, uses and protects your personal data in the Huntly World app.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeading({
  number,
  children,
}: {
  number: number;
  children: ReactNode;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2.5 text-base font-semibold text-huntly-forest sm:text-[1.0625rem]">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-huntly-moss/15 text-[0.6875rem] font-bold text-huntly-moss">
        {number}
      </span>
      {children}
    </h2>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-1.5 mt-5 text-sm font-semibold text-huntly-forest">
      {children}
    </h3>
  );
}

function P({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-sm leading-relaxed text-huntly-slate ${className}`}>
      {children}
    </p>
  );
}

function Ul({ children }: { children: ReactNode }) {
  return <ul className="mt-2 space-y-2">{children}</ul>;
}

function Li({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed text-huntly-slate">
      <span className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-huntly-leaf" />
      <span>{children}</span>
    </li>
  );
}

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="font-medium text-huntly-moss underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}

// ─── Table of Contents ────────────────────────────────────────────────────────

const toc = [
  { id: "about", label: "About this policy" },
  { id: "who-we-are", label: "Who we are and how to contact us" },
  { id: "who-this-covers", label: "Who this policy covers" },
  { id: "what-we-collect", label: "What personal data we collect" },
  { id: "lawful-basis", label: "Our lawful basis for processing" },
  { id: "how-we-use", label: "How we use your data" },
  { id: "who-we-share", label: "Who we share your data with" },
  { id: "international-transfers", label: "International data transfers" },
  { id: "profile-photos", label: "Profile photos" },
  { id: "data-retention", label: "Data retention" },
  { id: "security", label: "Security" },
  { id: "childrens-privacy", label: "Children's privacy" },
  { id: "your-rights", label: "Your rights" },
  { id: "device-identifiers", label: "Device identifiers and analytics" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact-us", label: "Contact us" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivacyPolicyPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="bg-huntly-stone/20 py-10 sm:py-12">
        <div className="section">
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-huntly-slate">
              <span className="rounded-full bg-huntly-moss/10 px-2.5 py-0.5 font-semibold text-huntly-moss">
                v1.1
              </span>
              <span>Last updated: February 2025</span>
              <span aria-hidden="true">·</span>
              <span>Applies to: iOS and Android</span>
            </div>
            <h1 className="font-display text-2xl font-semibold text-huntly-forest sm:text-3xl">
              Privacy Policy
            </h1>
            <p className="max-w-prose text-sm leading-relaxed text-huntly-slate sm:text-base">
              This policy explains how{" "}
              <strong className="font-semibold text-huntly-forest">
                Fluff Software Limited
              </strong>{" "}
              collects, uses, stores and protects personal data when you use the
              Huntly World mobile application and related services.
            </p>
            <p className="text-xs text-huntly-slate/80">
              Data controller: Fluff Software Limited · Company no. 12275014
            </p>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="section py-10 sm:py-14">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* Table of Contents */}
          <div className="card">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-huntly-slate">
              Contents
            </h2>
            <ol className="grid gap-y-1.5 sm:grid-cols-2">
              {toc.map(({ id, label }, i) => (
                <li key={id} className="flex items-start gap-2">
                  <span className="mt-0.5 w-5 shrink-0 text-right text-xs tabular-nums text-huntly-stone">
                    {i + 1}.
                  </span>
                  <a
                    href={`#${id}`}
                    className="text-sm leading-snug text-huntly-slate transition-colors hover:text-huntly-moss"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </div>

          {/* Policy Document */}
          <div className="card divide-y divide-huntly-stone/40 overflow-hidden p-0">

            {/* 1. About this policy */}
            <section id="about" className="px-6 py-7 sm:px-8">
              <SectionHeading number={1}>About this policy</SectionHeading>
              <P>
                This privacy policy explains how Fluff Software Limited ("we",
                "us", "our") collects, uses, stores and protects personal data
                when you use the Huntly World mobile application and related
                services ("the App").
              </P>
              <P className="mt-3">
                Fluff Software Limited is the data controller for the personal
                data described in this policy. We are committed to protecting the
                privacy of all our users, particularly children. Huntly World is
                designed for use by families and clubs to encourage children to
                explore the outdoors through stories, missions and friendly
                characters.
              </P>
            </section>

            {/* 2. Who we are */}
            <section id="who-we-are" className="px-6 py-7 sm:px-8">
              <SectionHeading number={2}>
                Who we are and how to contact us
              </SectionHeading>
              <div className="rounded-xl border border-huntly-stone/60 bg-huntly-parchment/60 p-4">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-huntly-forest">Data controller:</dt>
                    <dd className="text-huntly-slate">Fluff Software Limited</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-huntly-forest">Company number:</dt>
                    <dd className="text-huntly-slate">12275014</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-huntly-forest">Registered office:</dt>
                    <dd className="text-huntly-slate">
                      Nexus Business Centre, 6 Darby Close, Cheney Manor,
                      Swindon, England, SN2 2PN
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-huntly-forest">Website:</dt>
                    <dd><A href="https://huntly.world">huntly.world</A></dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-huntly-forest">Privacy contact:</dt>
                    <dd>
                      <A href="mailto:huntly@fluff.software">
                        huntly@fluff.software
                      </A>
                    </dd>
                  </div>
                </dl>
              </div>
              <P className="mt-4">
                We aim to respond to all privacy enquiries within 30 days. If
                you are in the UK, you have the right to complain to the
                Information Commissioner&apos;s Office (ICO):{" "}
                <A href="https://ico.org.uk/concerns">ico.org.uk/concerns</A>.
                If you are in the EU/EEA, you may contact your local supervisory
                authority.
              </P>
            </section>

            {/* 3. Who this policy covers */}
            <section id="who-this-covers" className="px-6 py-7 sm:px-8">
              <SectionHeading number={3}>Who this policy covers</SectionHeading>
              <P>This policy covers two types of users:</P>
              <Ul>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Account holders
                  </strong>{" "}
                  – parents or guardians aged 18 or over who create and manage
                  an account on behalf of their family or club.
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Child users
                  </strong>{" "}
                  – children under the age of 13 for whom a parent or guardian
                  has created an explorer profile.
                </Li>
              </Ul>
              <P className="mt-4">
                Children cannot create their own accounts. All accounts must be
                created by a parent or guardian. By creating an account, you
                confirm you are at least 18 years old and have the authority to
                agree to this policy on behalf of your child.
              </P>
            </section>

            {/* 4. What personal data we collect */}
            <section id="what-we-collect" className="px-6 py-7 sm:px-8">
              <SectionHeading number={4}>
                What personal data we collect
              </SectionHeading>

              <Sub>Account holder data</Sub>
              <P>When you create an account we collect:</P>
              <Ul>
                <Li>
                  Your email address (used for sign-in and communications)
                </Li>
                <Li>
                  Your password, managed via Supabase Auth and stored in hashed
                  form — we never store plain-text passwords
                </Li>
                <Li>
                  Any preferences or settings you configure in the app
                </Li>
              </Ul>

              <Sub>Child explorer profile data</Sub>
              <P>When you set up a profile for a child we collect:</P>
              <Ul>
                <Li>
                  The child&apos;s first name or nickname (as entered by you)
                </Li>
                <Li>Team or group selection</Li>
                <Li>In-app progress, achievements and mission data</Li>
                <Li>
                  A profile photo uploaded by you to personalise the
                  child&apos;s profile (see{" "}
                  <a
                    href="#profile-photos"
                    className="font-medium text-huntly-moss underline-offset-2 hover:underline"
                  >
                    Profile photos
                  </a>{" "}
                  for full details)
                </Li>
              </Ul>

              <Sub>Technical data</Sub>
              <P>
                We automatically collect limited technical information to operate
                and improve the App:
              </P>
              <Ul>
                <Li>Device type and operating system version</Li>
                <Li>App version</Li>
                <Li>
                  Basic anonymised analytics via Apple App Analytics, Google
                  Play Analytics and Expo&apos;s built-in analytics — this data
                  is aggregated and does not identify individual users
                </Li>
              </Ul>
              <P className="mt-3">
                We do not collect precise location data, voice recordings or
                biometric data.
              </P>

              <Sub>Push notifications</Sub>
              <P>
                If you grant permission, we use Expo&apos;s push notification
                service to send app notifications (for example, mission updates
                or account alerts). Expo stores your device&apos;s push token
                solely for notification delivery; notification content is not
                retained by Expo after delivery. You can withdraw permission at
                any time in your device settings.
              </P>
            </section>

            {/* 5. Lawful basis */}
            <section id="lawful-basis" className="px-6 py-7 sm:px-8">
              <SectionHeading number={5}>
                Our lawful basis for processing
              </SectionHeading>
              <P>
                UK GDPR and EU GDPR require us to have a lawful basis for
                processing personal data. Our bases are:
              </P>
              <Ul>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Contract
                  </strong>{" "}
                  – processing your account data to provide the service you have
                  signed up for.
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Consent
                  </strong>{" "}
                  – where we rely on your agreement, such as sending marketing
                  communications or processing a child&apos;s profile photo. You
                  can withdraw consent at any time by contacting{" "}
                  <A href="mailto:huntly@fluff.software">
                    huntly@fluff.software
                  </A>{" "}
                  or adjusting your in-app settings.
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Legitimate interests
                  </strong>{" "}
                  – processing anonymised usage data to improve the App, where
                  this does not override your rights.
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Legal obligation
                  </strong>{" "}
                  – where we are required to process data to comply with
                  applicable law.
                </Li>
              </Ul>
              <P className="mt-4">
                For children&apos;s data, we rely on the consent of the parent
                or guardian who created the account. We process children&apos;s
                personal data only to the extent necessary to provide the in-app
                experience.
              </P>
            </section>

            {/* 6. How we use your data */}
            <section id="how-we-use" className="px-6 py-7 sm:px-8">
              <SectionHeading number={6}>How we use your data</SectionHeading>
              <P>We use the data we collect to:</P>
              <Ul>
                <Li>Create and manage your account</Li>
                <Li>
                  Provide the Huntly World experience, including explorer
                  profiles, missions and progress tracking
                </Li>
                <Li>
                  Authenticate you securely and enable password reset via
                  Supabase Auth
                </Li>
                <Li>
                  Review and moderate uploaded profile photos before they are
                  made visible to other users
                </Li>
                <Li>
                  Send service-related notifications and, where you have
                  consented, marketing updates
                </Li>
                <Li>
                  Improve and develop the App using anonymised usage data
                </Li>
                <Li>
                  Comply with our legal obligations and enforce our terms
                </Li>
              </Ul>
              <P className="mt-4">
                We do not use children&apos;s personal data for advertising,
                profiling, or any purpose beyond delivering and improving the
                in-app experience.
              </P>
            </section>

            {/* 7. Who we share your data with */}
            <section id="who-we-share" className="px-6 py-7 sm:px-8">
              <SectionHeading number={7}>
                Who we share your data with
              </SectionHeading>
              <P>
                We share data only where necessary and with appropriate
                safeguards in place.
              </P>

              <Sub>Supabase (database, storage and authentication)</Sub>
              <P>
                Supabase Inc. is our primary data infrastructure provider,
                supplying database storage, file storage and user authentication
                (Supabase Auth). Supabase is based in the USA. We have a Data
                Processing Addendum (DPA) with Supabase incorporating:
              </P>
              <Ul>
                <Li>
                  EU Standard Contractual Clauses (SCCs) under Commission
                  Decision 2021/914 (Module 2, controller to processor)
                </Li>
                <Li>The UK ICO-approved Addendum to the SCCs</Li>
                <Li>
                  A Transfer Impact Assessment prepared by Supabase&apos;s EU
                  privacy counsel
                </Li>
              </Ul>
              <P className="mt-3">
                Supabase processes data only on our instructions and may not use
                it for its own purposes. Data is encrypted in transit (TLS) and
                at rest.
              </P>

              <Sub>Expo (push notifications)</Sub>
              <P>
                Expo (650 Industries Inc., USA) is used solely to deliver push
                notifications to your device. Expo stores your device push token
                for delivery purposes only; notification content is not retained
                after delivery. Expo is GDPR-, CCPA- and US Data Privacy
                Framework-compliant.
              </P>

              <Sub>Platform analytics</Sub>
              <P>
                Apple App Analytics and Google Play Analytics provide us with
                aggregated, anonymised statistics only. We receive no
                individually identifiable data from these platforms.
              </P>

              <Sub>Internal moderation</Sub>
              <P>
                Profile photos are reviewed by members of our internal admin
                team before being made visible to other users. Team members are
                subject to confidentiality obligations and access controls.
              </P>

              <Sub>General</Sub>
              <P>
                We do not sell your personal data. We do not share personal data
                with third parties for their own marketing. We may disclose data
                where required by law, court order, or to protect the rights,
                safety or property of Fluff Software Limited, our users or
                others.
              </P>
            </section>

            {/* 8. International data transfers */}
            <section id="international-transfers" className="px-6 py-7 sm:px-8">
              <SectionHeading number={8}>
                International data transfers
              </SectionHeading>
              <P>
                Supabase and Expo are based in the United States. When we
                transfer personal data outside the UK or EEA, appropriate
                safeguards are in place:
              </P>
              <Ul>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Supabase:
                  </strong>{" "}
                  EU SCCs (Module 2, controller to processor) under Commission
                  Decision 2021/914, plus the UK ICO-approved Addendum. A
                  Transfer Impact Assessment is also in place.
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Expo:
                  </strong>{" "}
                  participates in the EU-US Data Privacy Framework and is
                  GDPR-compliant. Push token data is processed solely for
                  notification delivery.
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Apple/Google analytics:
                  </strong>{" "}
                  data is aggregated and anonymised before reaching us; no
                  personal data is transferred on our behalf.
                </Li>
              </Ul>
            </section>

            {/* 9. Profile photos */}
            <section id="profile-photos" className="px-6 py-7 sm:px-8">
              <SectionHeading number={9}>Profile photos</SectionHeading>
              <P>
                Account holders may upload a photo to personalise a
                child&apos;s explorer profile. The following process applies to
                all uploaded photos:
              </P>
              <Ul>
                <Li>
                  Photos are uploaded by account holders (parents or guardians)
                  and stored securely in Supabase Storage
                </Li>
                <Li>
                  Each photo is reviewed by a member of our internal admin team,
                  who checks that no identifiable individuals or sensitive
                  details are visible
                </Li>
                <Li>
                  Only photos that pass review are approved and made visible to
                  other users within the app
                </Li>
                <Li>
                  Photos that do not pass review are permanently deleted
                </Li>
              </Ul>
              <P className="mt-4">
                We do not use profile photos for any purpose other than
                displaying them within the Huntly World app. Photos are not
                shared with third parties beyond the storage infrastructure
                described in{" "}
                <a
                  href="#who-we-share"
                  className="font-medium text-huntly-moss underline-offset-2 hover:underline"
                >
                  section 7
                </a>
                .
              </P>
              <P className="mt-3">
                You can remove a profile photo at any time from within the app,
                or by contacting{" "}
                <A href="mailto:huntly@fluff.software">huntly@fluff.software</A>
                .
              </P>
            </section>

            {/* 10. Data retention */}
            <section id="data-retention" className="px-6 py-7 sm:px-8">
              <SectionHeading number={10}>Data retention</SectionHeading>
              <P>
                We keep your data for as long as your account is active or as
                needed to provide the service:
              </P>
              <Ul>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Account holder email and authentication data:
                  </strong>{" "}
                  retained for the life of the account plus 30 days after
                  deletion to allow for account recovery, then permanently
                  deleted
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Child explorer profile data
                  </strong>{" "}
                  (names, progress, photos): deleted when the profile is deleted
                  or the account is closed
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Anonymised usage and analytics data:
                  </strong>{" "}
                  retained indefinitely as it cannot be linked to individuals
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Data required for legal compliance:
                  </strong>{" "}
                  retained for the period required by applicable law
                </Li>
              </Ul>
              <P className="mt-4">
                When you delete your account, we will delete or anonymise your
                personal data within 30 days, except where retention is required
                by law.
              </P>
            </section>

            {/* 11. Security */}
            <section id="security" className="px-6 py-7 sm:px-8">
              <SectionHeading number={11}>Security</SectionHeading>
              <P>
                We implement industry-standard technical and organisational
                measures to protect your data, including:
              </P>
              <Ul>
                <Li>
                  Encrypted data transmission using TLS for all communications
                  between the App and our servers
                </Li>
                <Li>
                  Encryption at rest for all data stored in Supabase (AES-256)
                </Li>
                <Li>
                  Secure user authentication via Supabase Auth, with passwords
                  stored as salted hashes
                </Li>
                <Li>
                  Access controls limiting which team members can access
                  personal data
                </Li>
                <Li>
                  Internal moderation processes for user-uploaded photos
                </Li>
              </Ul>
              <P className="mt-4">
                You are responsible for keeping your account credentials secure.
                If you suspect unauthorised access, contact us immediately at{" "}
                <A href="mailto:huntly@fluff.software">huntly@fluff.software</A>
                .
              </P>
              <P className="mt-3">
                In the event of a personal data breach likely to result in risk
                to your rights and freedoms, we will notify you and the relevant
                supervisory authority as required by law (within 72 hours of
                becoming aware, where required).
              </P>
            </section>

            {/* 12. Children's privacy */}
            <section id="childrens-privacy" className="px-6 py-7 sm:px-8">
              <SectionHeading number={12}>
                Children&apos;s privacy
              </SectionHeading>
              <P>
                Huntly World is used by children under the age of 13. We take
                our obligations under the UK ICO Children&apos;s Code (Age
                Appropriate Design Code), UK GDPR and the US Children&apos;s
                Online Privacy Protection Act (COPPA) seriously.
              </P>
              <P className="mt-3">Our commitments:</P>
              <Ul>
                <Li>
                  Children cannot create their own accounts — all accounts are
                  created and managed by a parent or guardian
                </Li>
                <Li>
                  We collect only the minimum personal data needed to provide
                  the in-app experience
                </Li>
                <Li>
                  We do not use children&apos;s data for advertising,
                  behavioural tracking or commercial profiling
                </Li>
                <Li>
                  We do not share children&apos;s personal data with third
                  parties except as described in this policy
                </Li>
                <Li>
                  Profile photos are subject to human moderation before being
                  made visible to other users
                </Li>
                <Li>
                  We do not knowingly allow children to communicate publicly or
                  share personal data beyond their family account
                </Li>
              </Ul>
              <P className="mt-4">
                If you are a parent or guardian and believe we have collected
                data from or about your child in error, or wish to review,
                correct or delete your child&apos;s data, please contact us at{" "}
                <A href="mailto:huntly@fluff.software">huntly@fluff.software</A>
                .
              </P>
            </section>

            {/* 13. Your rights */}
            <section id="your-rights" className="px-6 py-7 sm:px-8">
              <SectionHeading number={13}>Your rights</SectionHeading>
              <P>
                Depending on where you live, you may have the right to:
              </P>
              <Ul>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Access
                  </strong>{" "}
                  – request a copy of the personal data we hold about you
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Correction
                  </strong>{" "}
                  – ask us to correct inaccurate or incomplete data
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Deletion
                  </strong>{" "}
                  – ask us to delete your data (subject to legal retention
                  requirements)
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Portability
                  </strong>{" "}
                  – request your data in a structured, machine-readable format
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Restriction
                  </strong>{" "}
                  – ask us to restrict processing in certain circumstances
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Objection
                  </strong>{" "}
                  – object to processing based on legitimate interests
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Withdraw consent
                  </strong>{" "}
                  – where we rely on consent, you can withdraw it at any time
                  without affecting prior processing
                </Li>
              </Ul>
              <P className="mt-4">
                To exercise any of these rights, contact us at{" "}
                <A href="mailto:huntly@fluff.software">huntly@fluff.software</A>
                . We will respond within one month as required by UK/EU GDPR. We
                may need to verify your identity before acting on a request. As
                a parent or guardian, you may exercise these rights on behalf of
                your child.
              </P>
              <P className="mt-3">
                US users in states with applicable privacy laws (including
                California — CCPA/CPRA) may have additional rights, including
                the right to know what data is collected and the right to opt
                out of sale (we do not sell data).
              </P>
              <P className="mt-3">
                If you are in the UK, you have the right to complain to the ICO
                (
                <A href="https://ico.org.uk">ico.org.uk</A>). If you are in the
                EU/EEA, you may contact your local data protection authority.
              </P>
            </section>

            {/* 14. Device identifiers and analytics */}
            <section id="device-identifiers" className="px-6 py-7 sm:px-8">
              <SectionHeading number={14}>
                Device identifiers and analytics
              </SectionHeading>
              <P>The App uses the following device-level technologies:</P>
              <Ul>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Expo push token
                  </strong>{" "}
                  – a device identifier used solely to deliver push
                  notifications. Stored by Expo; not used for tracking or
                  advertising.
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Supabase Auth session token
                  </strong>{" "}
                  – a secure session token stored on your device to keep you
                  logged in. Cleared on sign-out.
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Apple App Analytics
                  </strong>{" "}
                  – aggregated, anonymised usage statistics collected by Apple.
                  We receive no individually identifiable data.
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Google Play Analytics
                  </strong>{" "}
                  – aggregated, anonymised usage statistics collected by Google.
                  We receive no individually identifiable data.
                </Li>
                <Li>
                  <strong className="font-semibold text-huntly-forest">
                    Expo analytics
                  </strong>{" "}
                  – basic, anonymised app performance data. No personally
                  identifiable data is shared with us.
                </Li>
              </Ul>
              <P className="mt-4">
                None of these technologies are used for advertising or cross-app
                tracking.
              </P>
            </section>

            {/* 15. Changes to this policy */}
            <section id="changes" className="px-6 py-7 sm:px-8">
              <SectionHeading number={15}>
                Changes to this policy
              </SectionHeading>
              <P>
                We may update this policy from time to time. Where changes are
                significant, we will notify you by a prominent notice within the
                App or by email, and will always update the &ldquo;Last
                updated&rdquo; date at the top of this policy.
              </P>
              <P className="mt-3">
                For material changes that affect how we process children&apos;s
                data, we will seek fresh consent from account holders where
                required by law.
              </P>
            </section>

            {/* 16. Contact us */}
            <section id="contact-us" className="px-6 py-7 sm:px-8">
              <SectionHeading number={16}>Contact us</SectionHeading>
              <div className="rounded-xl border border-huntly-stone/60 bg-huntly-parchment/60 p-4">
                <dl className="space-y-1.5 text-sm">
                  <div>
                    <dt className="font-semibold text-huntly-forest">
                      Fluff Software Limited
                    </dt>
                    <dd className="text-huntly-slate">
                      Company number: 12275014
                    </dd>
                    <dd className="text-huntly-slate">
                      Nexus Business Centre, 6 Darby Close, Cheney Manor,
                      Swindon, England, SN2 2PN
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2 pt-1">
                    <dt className="font-semibold text-huntly-forest">
                      Website:
                    </dt>
                    <dd>
                      <A href="https://huntly.world">huntly.world</A>
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-huntly-forest">
                      Email:
                    </dt>
                    <dd>
                      <A href="mailto:huntly@fluff.software">
                        huntly@fluff.software
                      </A>
                    </dd>
                  </div>
                </dl>
              </div>
              <P className="mt-4">
                We aim to respond to all privacy enquiries within 30 days.
              </P>
            </section>

          </div>

          {/* Document footer */}
          <p className="text-center text-xs text-huntly-slate">
            Last updated: February 2025 · Version 1.1 · Fluff Software Limited
            (Company no. 12275014)
          </p>

        </div>
      </div>
    </>
  );
}
