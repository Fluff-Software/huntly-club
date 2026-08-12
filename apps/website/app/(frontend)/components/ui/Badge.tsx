import type { ReactNode } from "react";

type BadgeColor = "tan" | "gold";

// "tan" renders as a pill (for cream-background sections). "gold" renders as
// plain uppercase text with no pill, matching the mockup's eyebrow label on
// the dark-green Mission section.
const colorClasses: Record<BadgeColor, string> = {
  tan: "inline-block rounded-full bg-brand-tan/60 px-4 py-1.5 text-brand-green",
  gold: "inline-block text-brand-gold",
};

export default function Badge({
  color = "tan",
  children,
}: {
  color?: BadgeColor;
  children: ReactNode;
}) {
  return (
    <span className={`text-xs font-semibold uppercase tracking-wide ${colorClasses[color]}`}>
      {children}
    </span>
  );
}
