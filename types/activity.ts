import { Tables } from "@/models/supabase";

// Extend the auto-generated Activity type to include categories
export type Activity = Tables<"activities"> & {
  categories: string[];
};

// Type for category filtering
export type CategoryFilter = {
  category: string;
  label: string;
  icon: string;
  color: string;
};

// Common categories used in the app
export const ACTIVITY_CATEGORIES: CategoryFilter[] = [
  {
    category: "nature",
    label: "Nature",
    icon: "🌿",
    color: "#4CAF50",
  },
  {
    category: "photography",
    label: "Photography",
    icon: "📸",
    color: "#2196F3",
  },
  {
    category: "outdoor",
    label: "Outdoor",
    icon: "🏕️",
    color: "#FF9800",
  },
  {
    category: "wildlife",
    label: "Wildlife",
    icon: "🐦",
    color: "#795548",
  },
  {
    category: "exploration",
    label: "Exploration",
    icon: "🗺️",
    color: "#9C27B0",
  },
  {
    category: "creativity",
    label: "Creativity",
    icon: "🎨",
    color: "#E91E63",
  },
  {
    category: "observation",
    label: "Observation",
    icon: "👁️",
    color: "#607D8B",
  },
];
