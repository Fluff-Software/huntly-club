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

// Common categories used in the app (icon = MaterialIcons name)
export const ACTIVITY_CATEGORIES: CategoryFilter[] = [
  {
    category: "nature",
    label: "Nature",
    icon: "eco",
    color: "#4CAF50",
  },
  {
    category: "photography",
    label: "Photography",
    icon: "camera-alt",
    color: "#2196F3",
  },
  {
    category: "outdoor",
    label: "Outdoor",
    icon: "cabin",
    color: "#FF9800",
  },
  {
    category: "wildlife",
    label: "Wildlife",
    icon: "pets",
    color: "#795548",
  },
  {
    category: "exploration",
    label: "Exploration",
    icon: "travel-explore",
    color: "#9C27B0",
  },
  {
    category: "creativity",
    label: "Creativity",
    icon: "brush",
    color: "#E91E63",
  },
  {
    category: "observation",
    label: "Observation",
    icon: "visibility",
    color: "#607D8B",
  },
];
