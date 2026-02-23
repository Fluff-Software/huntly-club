"use client";

import { useEffect } from "react";

const VERIFY_SUCCESS_PATH = "/verify-success";

export default function AuthConfirmPage() {
  useEffect(() => {
    window.location.replace(VERIFY_SUCCESS_PATH);
  }, []);

  return (
    <div className="section flex min-h-[60vh] items-center justify-center">
      <div className="card max-w-md text-center">
        <p className="text-sm leading-relaxed text-huntly-slate">
          Taking you back to the app…
        </p>
      </div>
    </div>
  );
}
