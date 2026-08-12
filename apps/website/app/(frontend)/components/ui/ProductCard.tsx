import type { ReactNode } from "react";

export default function ProductCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl bg-white ${className}`}>{children}</div>
  );
}
