"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "huntly_cookie_consent";

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

function updateGtmConsent(value: "granted" | "denied") {
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  gtag("consent", "update", {
    analytics_storage: value,
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
  });
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "granted");
    updateGtmConsent("granted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "denied");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:flex sm:justify-center">
      <div className="card flex flex-col gap-3 sm:max-w-lg sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-sm text-huntly-slate">
          We use cookies to understand how people find and use Huntly World.{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-huntly-forest">
            Privacy policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button onClick={decline} className="btn-ghost px-4 py-2 text-sm">
            Decline
          </button>
          <button onClick={accept} className="btn-primary px-4 py-2 text-sm">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
