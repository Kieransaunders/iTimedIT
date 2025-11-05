import { api } from "@/convex/_generated/api";
import { Category } from "@/types/models";
import { useQuery } from "convex/react";

export interface UseCategoriesReturn {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Categories management hook
 * Fetches categories for the current organization and user
 * 
 * This hook fetches all categories available to the user, including:
 * - Organization-level categories (shared across the organization)
 * - User-level categories (personal to the user)
 * 
 * Categories are automatically sorted by:
 * 1. Default categories first
 * 2. Alphabetically by name
 * 
 * Requirements: 5.1, 5.2, 5.3
 * 
 * @returns {UseCategoriesReturn} Object containing categories array, loading state, and error state
 */
export function useCategories(): UseCategoriesReturn {
  // Fetch categories from Convex
  // The query automatically filters by the user's current organization
  // and returns both organization-level and user-level categories
  const categoriesData = useQuery(api.categories.getCategories);

  // Determine loading state
  // Convex queries return undefined while loading
  const isLoading = categoriesData === undefined;

  // Extract categories array
  // Default to empty array if data is not yet loaded
  const categories = (categoriesData as Category[] | undefined) ?? [];

  return {
    categories,
    isLoading,
    error: null, // Convex handles errors internally and will retry automatically
  };
}
