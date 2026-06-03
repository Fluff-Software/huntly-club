"use client";

import dynamic from "next/dynamic";
import type { CampfireEditorShellProps } from "./CampfireEditorShell";

const CampfireEditorClient = dynamic(
  () =>
    import("./CampfireEditorShell").then((mod) => mod.CampfireEditorShell),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center bg-stone-950 text-sm text-stone-400">
        Loading editor…
      </div>
    ),
  }
);

export function CampfireEditorLoader(props: CampfireEditorShellProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CampfireEditorClient {...props} />
    </div>
  );
}
