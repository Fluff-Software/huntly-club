import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Huntly Club – Outdoor adventures for curious kids",
  description:
    "Huntly Club brings screen-lite, story-driven quests that get kids outdoors exploring nature while building confidence and curiosity.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/contact", label: "Get in touch" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body>
        <div className="page-shell">
          <header className="border-b border-[var(--color-border-subtle)] bg-[var(--color-background)]/80 backdrop-blur">
            <div className="section flex items-center justify-between py-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-2xl bg-huntly-moss/10">
                  <Image
                    src="/logo.png"
                    alt="Huntly Club logo"
                    fill
                    sizes="40px"
                    className="object-contain p-1.5"
                  />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-huntly-forest">
                    Huntly Club
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Outdoor adventure app for kids
                  </span>
                </div>
              </Link>

              <nav className="flex items-center gap-4">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="nav-link">
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="https://www.huntly.app/"
                  className="btn-primary ml-1 hidden sm:inline-flex"
                >
                  Learn about Huntly
                </Link>
              </nav>
            </div>
          </header>

          <main className="page-main">{children}</main>

          <footer className="border-t border-[var(--color-border-subtle)] bg-[var(--color-background)] py-6">
            <div className="section flex flex-col items-start justify-between gap-3 text-xs text-[var(--color-text-muted)] sm:flex-row sm:items-center">
              <p>© {new Date().getFullYear()} Fluff Software Limited.</p>
              <div className="flex flex-wrap gap-4">
                <Link href="/contact" className="underline-offset-2 hover:underline">
                  Get in touch
                </Link>
                <Link
                  href="https://www.huntly.app/"
                  className="underline-offset-2 hover:underline"
                >
                  Huntly app
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

