"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { href: "/#mission", label: "Mission" },
  { href: "/#what-we-make", label: "What we make" },
  { href: "/#partners", label: "Partners" },
];

export default function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        isScrolled
          ? "border-b border-brand-tan/40 bg-brand-cream/75 shadow-sm backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="section-wide flex min-w-0 items-center justify-between gap-3 py-3 sm:gap-5 sm:py-4">
        <Link href="/" className="flex min-w-0 shrink items-center">
          <Image src="/logo.webp" alt="Huntly" width={251} height={87} className="h-8 w-auto sm:h-9" priority />
        </Link>

        <nav className="flex shrink-0 items-center gap-4 sm:gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link hidden text-sm sm:inline-block">
              {link.label}
            </Link>
          ))}
          <Link
            href="/download"
            className="inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-full bg-brand-coral px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-[#c9432f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-coral focus-visible:ring-offset-2 focus-visible:ring-offset-brand-cream sm:px-5 sm:py-2.5"
          >
            Explore our apps
          </Link>
        </nav>
      </div>
    </header>
  );
}
