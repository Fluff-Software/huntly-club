export type ContentStatus =
  | "concept"
  | "outline"
  | "drafting"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

const STATUS_CONFIG: Record<
  ContentStatus,
  { label: string; classes: string }
> = {
  concept: {
    label: "Concept",
    classes: "bg-gray-100 text-gray-600 border-gray-200",
  },
  outline: {
    label: "Outline",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
  },
  drafting: {
    label: "Drafting",
    classes: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  in_review: {
    label: "In Review",
    classes: "bg-orange-50 text-orange-700 border-orange-200",
  },
  approved: {
    label: "Approved",
    classes: "bg-green-50 text-green-700 border-green-200",
  },
  published: {
    label: "Published",
    classes: "bg-huntly-forest/10 text-huntly-forest border-huntly-forest/20",
  },
  archived: {
    label: "Archived",
    classes: "bg-red-50 text-red-600 border-red-200",
  },
};

type Props = {
  status: ContentStatus;
  size?: "sm" | "md";
};

export function StatusPill({ status, size = "md" }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.concept;
  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-xs"
      : "px-2.5 py-1 text-xs font-medium";

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses} ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
