"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import type { CampfireSessionRow } from "../types";
import { CampfireStatusPill } from "./CampfireStatusPill";
import { CreateCampfireSessionModal } from "./CreateCampfireSessionModal";

function formatScheduledAt(iso: string | null): string {
  if (!iso) return "Not scheduled";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CampfireSessionsList({
  sessions,
}: {
  sessions: CampfireSessionRow[];
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-stone-900">
            Campfire Sessions
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Live presentations composed of audio, subtitles, mission cards, and
            submissions on a timeline.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center rounded-xl bg-huntly-forest px-4 py-2.5 text-sm font-medium text-huntly-cream transition-colors hover:bg-huntly-leaf sm:shrink-0"
        >
          New session
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-12 text-center text-stone-500">
          No campfire sessions yet. Create one to get started.
        </p>
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {sessions.map((s) => (
              <article
                key={s.id}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/campfire-sessions/${s.id}`}
                    className="font-medium text-stone-900 hover:text-huntly-forest"
                  >
                    {s.title}
                  </Link>
                  <CampfireStatusPill status={s.status} />
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  {formatScheduledAt(s.scheduled_at)}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {s.missions?.length ?? 0} missions
                </p>
                <div className="mt-3">
                  <Button
                    href={`/campfire-sessions/${s.id}`}
                    variant="primary"
                    size="sm"
                  >
                    Open editor
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[640px] rounded-xl border border-stone-200 bg-white text-left text-sm shadow-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/80">
                  <th className="px-4 py-3 font-medium text-stone-700">Title</th>
                  <th className="px-4 py-3 font-medium text-stone-700">Date</th>
                  <th className="px-4 py-3 font-medium text-stone-700">
                    Missions
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-700">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/campfire-sessions/${s.id}`}
                        className="font-medium text-stone-900 hover:text-huntly-forest"
                      >
                        {s.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {formatScheduledAt(s.scheduled_at)}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {s.missions?.length ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <CampfireStatusPill status={s.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        href={`/campfire-sessions/${s.id}`}
                        variant="primary"
                        size="sm"
                      >
                        Open editor
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CreateCampfireSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
