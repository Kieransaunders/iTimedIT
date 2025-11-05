import { Dropdown, DropdownOption } from "@/components/ui/Dropdown";
import { useCategories } from "@/hooks/useCategories";
import React, { useMemo } from "react";
import { ViewStyle } from "react-native";

export interface CategorySelectorProps {
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * Category selector component
 * Displays a dropdown/modal for selecting a category
 * 
 * Features:
 * - Fetches and displays available categories from Convex
 * - Shows both organization-level and user-level categories
 * - Displays default category when no category is selected
 * - Allows clearing category selection (optional category via "None" option)
 * - Handles loading and disabled states
 * - Marks default category with "(Default)" label
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export function CategorySelector({
  selectedCategory,
  onSelect,
  disabled = false,
  containerStyle,
}: CategorySelectorProps) {
  const { categories, isLoading } = useCategories();

  // Find default category
  const defaultCategory = useMemo(() => {
    const defaultCat = categories.find((cat) => cat.isDefault);
    return defaultCat?.name || null;
  }, [categories]);

  // Convert categories to dropdown options
  // Include a "None" option to allow clearing the selection
  const options: DropdownOption<string | null>[] = useMemo(() => {
    const categoryOptions: DropdownOption<string | null>[] = categories.map((category) => ({
      label: category.isDefault ? `${category.name} (Default)` : category.name,
      value: category.name,
    }));

    // Add "None" option at the beginning to allow clearing selection
    return [
      {
        label: "None",
        value: null,
      },
      ...categoryOptions,
    ];
  }, [categories]);

  // Determine the display value
  // If a category is explicitly selected, use it
  // Otherwise, show the default category if available
  const displayValue = selectedCategory || defaultCategory;

  // Determine the placeholder text
  const placeholder = useMemo(() => {
    if (isLoading) {
      return "Loading categories...";
    }
    if (defaultCategory && !selectedCategory) {
      return `${defaultCategory} (Default)`;
    }
    return "Select a category";
  }, [isLoading, defaultCategory, selectedCategory]);

  return (
    <Dropdown
      placeholder={placeholder}
      options={options}
      value={displayValue}
      onSelect={onSelect}
      disabled={disabled || isLoading}
      containerStyle={containerStyle}
    />
  );
}
