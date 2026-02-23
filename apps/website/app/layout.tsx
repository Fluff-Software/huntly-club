import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Huntly World – Your club. Your missions. Outdoors.",
  description:
    "Huntly World gets young explorers exploring with stories, missions and friendly characters - all in one app.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const navLinks = [{ href: "/", label: "Home" }];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={nunito.variable}>
      <body className="font-sans">
        <div className="page-shell">
          <header className="border-b-2 border-huntly-leaf/30 bg-huntly-parchment/95 backdrop-blur">
            <div className="section flex items-center justify-between py-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="relative h-8 w-32 md:h-9 md:w-40">
                  <Image
                    src="/logo.png"
                    alt="Huntly World logo"
                    fill
                    sizes="(max-width: 768px) 128px, 160px"
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-base font-bold text-huntly-forest">
                    Huntly World
                  </span>
                  <span className="text-xs text-huntly-slate">
                    Adventures for curious kids
                  </span>
                </div>
              </Link>

              <nav className="flex items-center gap-5">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="nav-link">
                    {link.label}
                  </Link>
                ))}
                <Link href="/contact" className="btn-primary">
                  Get in touch
                </Link>
              </nav>
            </div>
          </header>

          <main className="page-main">{children}</main>

          <footer className="border-t-2 border-huntly-stone bg-huntly-parchment py-6">
            <div className="section flex flex-col items-start justify-between gap-3 text-sm text-huntly-slate sm:flex-row sm:items-center">
              <div>
                <p>© {new Date().getFullYear()} Fluff Software Limited.</p>
                <p className="mt-1 text-xs text-huntly-slate/90">Adventures for curious kids.</p>
              </div>
              <div className="flex flex-wrap gap-5">
                <Link href="/contact" className="font-medium text-huntly-forest underline-offset-2 hover:underline">
                  Get in touch
                </Link>
                <Link
                  href="https://www.huntly.app/"
                  className="underline-offset-2 hover:underline"
                >
                  Also from us: Huntly
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

