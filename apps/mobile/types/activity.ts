import { Tables } from "@/models/supabase";

export type PrepChecklistItem = { title: string; description: string };
export type MissionStep = {
  instruction: string;
  tip: string | null;
  media_url: string | null;
};

export type Activity = Tables<"activities"> & {
  categories: number[];
  prep_checklist: PrepChecklistItem[] | null;
  steps: MissionStep[] | null;
  intro_urgent_message: string | null;
  intro_character_name: string | null;
  intro_character_avatar_url: string | null;
  intro_dialogue: string | null;
  intro_captain: string | null;
  intro_captain_pose: string | null;
  estimated_duration: string | null;
  optional_items: string[] | null;
  debrief_heading: string | null;
  debrief_photo_label: string | null;
  debrief_question_1: string | null;
  debrief_question_2: string | null;
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
