"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/seasons", label: "Seasons" },
  { href: "/activities", label: "Missions" },
  { href: "/categories", label: "Categories" },
  { href: "/resources", label: "Resources" },
  { href: "/photos", label: "Photos" },
  { href: "/account-removal", label: "Account Removal" },
  { href: "/admins", label: "Admins" },
  { href: "/account", label: "Account" },
];

const closeIcon = (
  <svg
    className="h-6 w-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
};

export function Sidebar({ open = false, onClose, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsMobile(!mq.matches);
    const fn = () => setIsMobile(!mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleLinkClick() {
    onNavigate?.();
  }

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-huntly-forest/80 bg-huntly-forest shadow-lg transition-transform duration-200 ease-out md:relative md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Admin navigation"
        aria-hidden={isMobile && !open}
      >
        <div className="flex items-center justify-between border-b border-huntly-leaf/40 px-5 py-5">
          <Link
            href="/dashboard"
            onClick={handleLinkClick}
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 focus:ring-offset-huntly-forest"
            aria-label="Huntly dashboard"
          >
            <div className="relative h-8 w-24">
              <Image
                src="/huntly-logo.png"
                alt="Huntly World"
                fill
                sizes="96px"
                className="object-contain"
                priority
              />
            </div>
          </Link>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 flex size-10 items-center justify-center rounded-lg text-huntly-mint transition-colors hover:bg-huntly-leaf/90 hover:text-huntly-cream focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-inset md:hidden"
              aria-label="Close menu"
            >
              {closeIcon}
            </button>
          )}
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-inset ${
                  isActive
                    ? "bg-huntly-leaf text-huntly-cream"
                    : "text-huntly-mint hover:bg-huntly-leaf/90 hover:text-huntly-cream"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-huntly-leaf/40 p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-huntly-mint transition-colors hover:bg-huntly-leaf/90 hover:text-huntly-cream focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-inset"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
