import { useState, useEffect, useCallback } from "react";
import { storage } from "@/services/storage";
import { Id } from "@/convex/_generated/dataModel";

const FAVORITES_STORAGE_KEY = "favorite_projects";

export interface UseFavoriteProjectsReturn {
  favoriteIds: string[];
  isFavorite: (projectId: string) => boolean;
  toggleFavorite: (projectId: string) => Promise<void>;
  addFavorite: (projectId: string) => Promise<void>;
  removeFavorite: (projectId: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * Hook for managing favorite projects
 *
 * Stores favorites in AsyncStorage and provides methods to add/remove/check favorites
 */
export function useFavoriteProjects(): UseFavoriteProjectsReturn {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from storage on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await storage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavoriteIds(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFavorites = async (ids: string[]) => {
    try {
      await storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error("Failed to save favorites:", error);
    }
  };

  const isFavorite = useCallback(
    (projectId: string): boolean => {
      return favoriteIds.includes(projectId);
    },
    [favoriteIds]
  );

  const addFavorite = useCallback(
    async (projectId: string) => {
      if (!favoriteIds.includes(projectId)) {
        const newFavorites = [...favoriteIds, projectId];
        setFavoriteIds(newFavorites);
        await saveFavorites(newFavorites);
      }
    },
    [favoriteIds]
  );

  const removeFavorite = useCallback(
    async (projectId: string) => {
      const newFavorites = favoriteIds.filter((id) => id !== projectId);
      setFavoriteIds(newFavorites);
      await saveFavorites(newFavorites);
    },
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    async (projectId: string) => {
      if (isFavorite(projectId)) {
        await removeFavorite(projectId);
      } else {
        await addFavorite(projectId);
      }
    },
    [isFavorite, addFavorite, removeFavorite]
  );

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    isLoading,
  };
}
