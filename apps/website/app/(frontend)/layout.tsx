import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import CookieBanner from "./components/CookieBanner";
import SiteHeader from "./components/SiteHeader";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hanken",
});

const BASE_URL = "https://huntly.world";
const DEFAULT_TITLE = "Huntly — Getting Kids Back Out Into the Real World";
const DEFAULT_DESCRIPTION =
  "Huntly makes technology that points children outward — toward parks, woods, streets and gardens. Two ways to start the adventure: the Huntly app and Huntly World, the adventure club.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | Huntly",
  },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: BASE_URL,
    siteName: "Huntly",
    locale: "en_GB",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="en-GB" className={`${bricolage.variable} ${hanken.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});try{var c=localStorage.getItem('huntly_cookie_consent');if(c==='granted'){gtag('consent','update',{analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});}}catch(e){}` }} />
      </head>
      {gtmId && (
        <Script id="gtm-script" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      )}
      <body className="font-sans">
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <CookieBanner />
        <div className="page-shell">
          <SiteHeader />

          <main className="page-main pt-16 sm:pt-20">{children}</main>

          <footer className="border-t border-brand-green bg-brand-green py-10 text-white/80">
            <div className="section-wide">
              <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
                <div>
                  <Link href="/" className="flex items-center">
                    <Image src="/logo.webp" alt="Huntly" width={251} height={87} className="h-9 w-auto" />
                  </Link>
                  <p className="mt-3 max-w-xs text-sm text-white/70">
                    Real-world adventures for curious kids. Made with care by Fluff Software.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Products</p>
                    <ul className="mt-3 space-y-2 text-sm">
                      <li>
                        <Link href="/huntly-app" className="hover:text-white hover:underline underline-offset-2">
                          Huntly app
                        </Link>
                      </li>
                      <li>
                        <Link href="/huntly-world" className="hover:text-white hover:underline underline-offset-2">
                          Huntly World
                        </Link>
                      </li>
                      <li>
                        <Link href="/pricing" className="hover:text-white hover:underline underline-offset-2">
                          Pricing
                        </Link>
                      </li>
                      <li>
                        <Link href="/blog" className="hover:text-white hover:underline underline-offset-2">
                          Blog
                        </Link>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Company</p>
                    <ul className="mt-3 space-y-2 text-sm">
                      <li>
                        <Link href="/parents" className="hover:text-white hover:underline underline-offset-2">
                          For parents
                        </Link>
                      </li>
                      <li>
                        <Link href="/schools" className="hover:text-white hover:underline underline-offset-2">
                          For schools
                        </Link>
                      </li>
                      <li>
                        <Link href="/scouts-alternative" className="hover:text-white hover:underline underline-offset-2">
                          Scouts alternative
                        </Link>
                      </li>
                      <li>
                        <Link href="/contact" className="hover:text-white hover:underline underline-offset-2">
                          Partner with us
                        </Link>
                      </li>
                      <li>
                        <Link href="/partners" className="hover:text-white hover:underline underline-offset-2">
                          Attraction partners
                        </Link>
                      </li>
                      <li>
                        <Link href="/feedback" className="hover:text-white hover:underline underline-offset-2">
                          Feedback
                        </Link>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Legal</p>
                    <ul className="mt-3 space-y-2 text-sm">
                      <li>
                        <Link href="/privacy" className="hover:text-white hover:underline underline-offset-2">
                          Privacy
                        </Link>
                      </li>
                      <li>
                        <Link href="/support" className="hover:text-white hover:underline underline-offset-2">
                          Support
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <p className="mt-10 border-t border-white/10 pt-6 text-xs text-white/50">
                © {new Date().getFullYear()} Fluff Software Limited. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

