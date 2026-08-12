import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "dark" | "outline" | "light";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-coral text-white hover:bg-[#c9432f] focus-visible:ring-brand-coral",
  dark: "bg-brand-green text-white hover:bg-[#0d2c21] focus-visible:ring-brand-green",
  outline:
    "border border-brand-green text-brand-green hover:bg-brand-green hover:text-white focus-visible:ring-brand-green",
  light:
    "bg-white text-brand-coral hover:bg-brand-cream focus-visible:ring-white",
};

export default function Button({
  href,
  variant = "primary",
  children,
  className = "",
}: {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex cursor-pointer items-center justify-center rounded-full px-6 py-3 text-base font-semibold shadow-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-cream ${variantClasses[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
