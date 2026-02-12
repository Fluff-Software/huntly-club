"use client";

import { Button } from "@/components/Button";

export default function PendingAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-center">
          <div className="rounded-full bg-huntly-sage/10 p-3">
            <svg
              className="h-8 w-8 text-huntly-forest"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-center text-xl font-semibold text-stone-900">
          Account Created
        </h1>
        <p className="mt-2 text-center text-sm text-stone-600">
          Your account has been created successfully!
        </p>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Admin Access Required
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  Your account does not have admin privileges yet. Please
                  contact an existing admin to grant you access to the admin
                  dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Button
            href="/login"
            size="lg"
            className="w-full"
          >
            Return to Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
