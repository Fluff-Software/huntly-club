/**
 * In-app privacy policy content for Huntly World.
 *
 * Data controller: Fluff Software Limited (Company no. 12275014)
 * Registered office: Nexus Business Centre, 6 Darby Close, Cheney Manor, Swindon, England, SN2 2PN
 *
 * Last updated: February 2025 | Version 1.1
 */
export const PRIVACY_POLICY_SECTIONS = [
  {
    title: "About this policy",
    body: "This privacy policy explains how Fluff Software Limited (\"we\", \"us\", \"our\") collects, uses, stores and protects personal data when you use the Huntly World mobile application and related services (\"the App\").\n\nFluff Software Limited is the data controller for the personal data described in this policy. We are committed to protecting the privacy of all our users, particularly children. Huntly World is designed for use by families and clubs to encourage children to explore the outdoors through stories, missions and friendly characters.",
  },
  {
    title: "Who we are and how to contact us",
    body: "Data controller: Fluff Software Limited\nCompany number: 12275014\nRegistered office: Nexus Business Centre, 6 Darby Close, Cheney Manor, Swindon, England, SN2 2PN\n\nWebsite: https://huntly.world\nPrivacy contact: huntly@fluff.software\n\nWe aim to respond to all privacy enquiries within 30 days. If you are in the UK, you have the right to complain to the Information Commissioner's Office (ICO): ico.org.uk/concerns. If you are in the EU/EEA, you may contact your local supervisory authority.",
  },
  {
    title: "Who this policy covers",
    body: "This policy covers two types of users:\n\n• Account holders – parents or guardians aged 18 or over who create and manage an account on behalf of their family or club.\n• Child users – children under the age of 13 for whom a parent or guardian has created an explorer profile.\n\nChildren cannot create their own accounts. All accounts must be created by a parent or guardian. By creating an account, you confirm you are at least 18 years old and have the authority to agree to this policy on behalf of your child.",
  },
  {
    title: "What personal data we collect",
    body: "Account holder data: When you create an account we collect your email address (for sign-in and communications) and your password, managed via Supabase Auth and stored in hashed form — we never store plain-text passwords.\n\nChild explorer profile data: When you set up a profile for a child we collect the child's first name or nickname (as entered by you), team or group selection, in-app progress and achievements, and a profile photo uploaded by you (see 'Profile photos' section for full details of how photos are handled).\n\nTechnical data: We automatically collect limited technical information including device type, operating system version, app version, and basic anonymised analytics via Apple App Analytics, Google Play Analytics and Expo's built-in analytics. This data is aggregated and does not identify individual users. We do not collect precise location data, voice recordings or biometric data.\n\nPush notifications: If you grant permission, we use Expo's push notification service to send app notifications. Expo stores your device's push token solely for notification delivery; notification content is not retained by Expo after delivery. You can withdraw permission at any time in your device settings.",
  },
  {
    title: "Our lawful basis for processing",
    body: "UK GDPR and EU GDPR require us to have a lawful basis for processing personal data. Our bases are:\n\n• Contract – processing your account data to provide the service you have signed up for.\n• Consent – where we rely on your agreement, such as sending marketing communications or processing a child's profile photo. You can withdraw consent at any time by contacting huntly@fluff.software or adjusting your in-app settings.\n• Legitimate interests – processing anonymised usage data to improve the App, where this does not override your rights.\n• Legal obligation – where we are required to process data to comply with applicable law.\n\nFor children's data, we rely on the consent of the parent or guardian who created the account. We process children's personal data only to the extent necessary to provide the in-app experience.",
  },
  {
    title: "How we use your data",
    body: "We use the data we collect to:\n\n• Create and manage your account\n• Provide the Huntly World experience, including explorer profiles, missions and progress tracking\n• Authenticate you securely and enable password reset via Supabase Auth\n• Review and moderate uploaded profile photos before they are made visible to other users\n• Send service-related notifications and, where you have consented, marketing updates\n• Improve and develop the App using anonymised usage data\n• Comply with our legal obligations and enforce our terms\n\nWe do not use children's personal data for advertising, profiling, or any purpose beyond delivering and improving the in-app experience.",
  },
  {
    title: "Who we share your data with",
    body: "We share data only where necessary and with appropriate safeguards.\n\nSupabase (database, storage and authentication): Supabase Inc. is our primary data infrastructure provider, supplying database storage, file storage and user authentication (Supabase Auth). Supabase is based in the USA. We have a Data Processing Addendum (DPA) with Supabase incorporating EU Standard Contractual Clauses (SCCs) under Commission Decision 2021/914, the UK ICO-approved Addendum to the SCCs, and a Transfer Impact Assessment prepared by Supabase's EU privacy counsel. Supabase processes data only on our instructions and may not use it for its own purposes. Data is encrypted in transit (TLS) and at rest.\n\nExpo (push notifications): Expo (650 Industries Inc., USA) is used solely to deliver push notifications. Expo stores your device push token for delivery purposes only; notification content is not retained after delivery. Expo is GDPR-, CCPA- and US Data Privacy Framework-compliant.\n\nPlatform analytics: Apple App Analytics and Google Play Analytics provide us with aggregated, anonymised statistics only. We receive no individually identifiable data.\n\nInternal moderation: Profile photos are reviewed by our internal admin team before being made visible. Team members are subject to confidentiality obligations and access controls.\n\nWe do not sell your personal data. We do not share personal data with third parties for their own marketing. We may disclose data where required by law or to protect the rights, safety or property of Fluff Software Limited, our users or others.",
  },
  {
    title: "International data transfers",
    body: "Supabase and Expo are based in the United States. When we transfer personal data outside the UK or EEA, appropriate safeguards are in place:\n\n• Supabase: EU SCCs (Module 2, controller to processor) under Commission Decision 2021/914, plus the UK ICO-approved Addendum. A Transfer Impact Assessment is also in place.\n• Expo: participates in the EU-US Data Privacy Framework and is GDPR-compliant. Push token data is processed solely for notification delivery.\n• Apple/Google analytics: data is aggregated and anonymised before reaching us; no personal data is transferred on our behalf.",
  },
  {
    title: "Profile photos",
    body: "Account holders may upload a photo to personalise a child's explorer profile. The following process applies to all uploaded photos:\n\n• Photos are uploaded by account holders (parents or guardians) and stored securely in Supabase Storage\n• Each photo is reviewed by a member of our internal admin team, who checks that no identifiable individuals or sensitive details are visible\n• Only photos that pass review are approved and made visible to other users within the app\n• Photos that do not pass review are permanently deleted\n\nWe do not use profile photos for any purpose other than displaying them within the Huntly World app. Photos are not shared with third parties beyond the storage infrastructure described in the 'Who we share your data with' section.\n\nYou can remove a profile photo at any time from within the app, or by contacting huntly@fluff.software.",
  },
  {
    title: "Data retention",
    body: "We keep your data for as long as your account is active or as needed to provide the service:\n\n• Account holder email and authentication data: retained for the life of the account plus 30 days after deletion to allow for account recovery, then permanently deleted\n• Child explorer profile data (names, progress, photos): deleted when the profile is deleted or the account is closed\n• Anonymised usage and analytics data: retained indefinitely as it cannot be linked to individuals\n• Data required for legal compliance: retained for the period required by applicable law\n\nWhen you delete your account, we will delete or anonymise your personal data within 30 days, except where retention is required by law.",
  },
  {
    title: "Security",
    body: "We implement industry-standard technical and organisational measures to protect your data, including:\n\n• Encrypted data transmission using TLS for all communications between the App and our servers\n• Encryption at rest for all data stored in Supabase (AES-256)\n• Secure user authentication via Supabase Auth, with passwords stored as salted hashes\n• Access controls limiting which team members can access personal data\n• Internal moderation processes for user-uploaded photos\n\nYou are responsible for keeping your account credentials secure. If you suspect unauthorised access, contact us immediately at huntly@fluff.software.\n\nIn the event of a personal data breach likely to result in risk to your rights and freedoms, we will notify you and the relevant supervisory authority as required by law (within 72 hours of becoming aware, where required).",
  },
  {
    title: "Children's privacy",
    body: "Huntly World is used by children under the age of 13. We take our obligations under the UK ICO Children's Code (Age Appropriate Design Code), UK GDPR and the US Children's Online Privacy Protection Act (COPPA) seriously.\n\nOur commitments:\n• Children cannot create their own accounts — all accounts are created and managed by a parent or guardian\n• We collect only the minimum personal data needed to provide the in-app experience\n• We do not use children's data for advertising, behavioural tracking or commercial profiling\n• We do not share children's personal data with third parties except as described in this policy\n• Profile photos are subject to human moderation before being made visible to other users\n• We do not knowingly allow children to communicate publicly or share personal data beyond their family account\n\nIf you are a parent or guardian and believe we have collected data from or about your child in error, or wish to review, correct or delete your child's data, please contact us at huntly@fluff.software.",
  },
  {
    title: "Your rights",
    body: "Depending on where you live, you may have the right to: access a copy of your personal data; correct inaccurate or incomplete data; delete your data (subject to legal retention requirements); receive your data in a portable format; restrict or object to certain processing; and withdraw consent where we rely on it.\n\nTo exercise any of these rights, contact us at huntly@fluff.software. We will respond within one month as required by UK/EU GDPR. We may need to verify your identity before acting on a request. As a parent or guardian, you may exercise these rights on behalf of your child.\n\nUS users in states with applicable privacy laws (including California — CCPA/CPRA) may have additional rights, including the right to know what data is collected and the right to opt out of sale (we do not sell data).\n\nIf you are in the UK, you have the right to complain to the ICO (ico.org.uk). If you are in the EU/EEA, you may contact your local data protection authority.",
  },
  {
    title: "Device identifiers and analytics",
    body: "The App uses the following device-level technologies:\n\n• Expo push token – a device identifier used solely to deliver push notifications. Stored by Expo; not used for tracking or advertising.\n• Supabase Auth session token – a secure session token stored on your device to keep you logged in. Cleared on sign-out.\n• Apple App Analytics – aggregated, anonymised usage statistics collected by Apple. We receive no individually identifiable data.\n• Google Play Analytics – aggregated, anonymised usage statistics collected by Google. We receive no individually identifiable data.\n• Expo analytics – basic, anonymised app performance data. No personally identifiable data is shared with us.\n\nNone of these technologies are used for advertising or cross-app tracking.",
  },
  {
    title: "Changes to this policy",
    body: "We may update this policy from time to time. Where changes are significant, we will notify you by a prominent notice within the App or by email, and will always update the \"Last updated\" date at the top of this policy.\n\nFor material changes that affect how we process children's data, we will seek fresh consent from account holders where required by law.",
  },
  {
    title: "Contact us",
    body: "Fluff Software Limited\nCompany number: 12275014\nNexus Business Centre, 6 Darby Close, Cheney Manor, Swindon, England, SN2 2PN\n\nWebsite: https://huntly.world\nEmail: huntly@fluff.software\n\nWe aim to respond to all privacy enquiries within 30 days.\n\nLast updated: February 2025.",
  },
];