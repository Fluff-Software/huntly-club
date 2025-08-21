import { Activity } from "@/types/activity";
import { ACTIVITY_CATEGORIES } from "@/types/activity";

/**
 * Get all unique categories from a list of activities
 */
export function getUniqueCategories(activities: Activity[]): string[] {
  const categories = new Set<string>();
  
  activities.forEach(activity => {
    if (activity.categories && Array.isArray(activity.categories)) {
      activity.categories.forEach(category => {
        categories.add(category);
      });
    }
  });
  
  return Array.from(categories).sort();
}

/**
 * Filter activities by category
 */
export function filterActivitiesByCategory(
  activities: Activity[],
  category: string
): Activity[] {
  return activities.filter(activity => 
    activity.categories && 
    Array.isArray(activity.categories) && 
    activity.categories.includes(category)
  );
}

/**
 * Filter activities by multiple categories (OR logic)
 */
export function filterActivitiesByCategories(
  activities: Activity[],
  categories: string[]
): Activity[] {
  if (categories.length === 0) return activities;
  
  return activities.filter(activity => 
    activity.categories && 
    Array.isArray(activity.categories) && 
    categories.some(category => activity.categories.includes(category))
  );
}

/**
 * Get category info by category name
 */
export function getCategoryInfo(category: string) {
  return ACTIVITY_CATEGORIES.find(cat => cat.category === category);
}

/**
 * Get category display name
 */
export function getCategoryLabel(category: string): string {
  const categoryInfo = getCategoryInfo(category);
  return categoryInfo?.label || category;
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: string): string {
  const categoryInfo = getCategoryInfo(category);
  return categoryInfo?.icon || "🏷️";
}

/**
 * Get category color
 */
export function getCategoryColor(category: string): string {
  const categoryInfo = getCategoryInfo(category);
  return categoryInfo?.color || "#6B7280";
}

/**
 * Format categories for display
 */
export function formatCategories(categories: string[]): string {
  if (!categories || categories.length === 0) return "";
  
  return categories
    .map(category => getCategoryLabel(category))
    .join(", ");
}
