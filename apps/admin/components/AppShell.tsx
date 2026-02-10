"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";

const menuIcon = (
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
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <header
        className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-stone-200 bg-white px-4 shadow-sm md:hidden"
        aria-label="Mobile navigation"
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="-ml-1 flex size-10 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-inset"
          aria-label="Open menu"
        >
          {menuIcon}
        </button>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-huntly-sage focus:ring-offset-2"
          aria-label="Huntly dashboard"
        >
          <div className="relative h-7 w-20">
            <Image
              src="/huntly-logo.png"
              alt="Huntly World"
              fill
              sizes="80px"
              className="object-contain"
              priority
            />
          </div>
        </Link>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={() => setSidebarOpen(false)}
      />

      <main className="min-w-0 flex-1 p-4 pt-14 md:p-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
