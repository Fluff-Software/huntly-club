"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/seasons", label: "Seasons" },
  { href: "/activities", label: "Activities" },
  { href: "/admins", label: "Admins" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="flex w-56 flex-col border-r border-huntly-forest/80 bg-huntly-forest shadow-lg"
      aria-label="Admin navigation"
    >
      <div className="border-b border-huntly-leaf/40 px-5 py-5">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight text-huntly-cream focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2 focus:ring-offset-huntly-forest"
        >
          Huntly Admin
        </Link>
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
  );
}
