import type { ReactNode } from "react";

type IconChipColor = "pink" | "teal" | "gold";

const colorClasses: Record<IconChipColor, string> = {
  pink: "bg-brand-pink",
  teal: "bg-brand-teal",
  gold: "bg-brand-gold",
};

// One glyph per chip color - fixed to the color, not admin-editable (see
// payload-src/blocks/FeaturesBlock.ts). Matches the three feature items the
// design actually uses: no ads, data privacy, made in the UK.
const icons: Record<IconChipColor, ReactNode> = {
  pink: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
    </svg>
  ),
  teal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L19 5.5 V11 C19 15.5 16 19 12 20.5 C8 19 5 15.5 5 11 V5.5 Z" />
      <polyline points="8.75 12 10.75 14 15.25 9.5" />
    </svg>
  ),
  gold: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3.5" x2="6" y2="20.5" />
      <path d="M6 4.5 H18 L15 8.5 L18 12.5 H6" />
    </svg>
  ),
};

export default function IconChip({ color }: { color: IconChipColor }) {
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClasses[color]}`}
      aria-hidden
    >
      <span className="h-5 w-5">{icons[color]}</span>
    </span>
  );
}
