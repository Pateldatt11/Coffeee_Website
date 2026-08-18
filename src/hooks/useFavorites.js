import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'coffee_favorites';

/**
 * useFavorites
 * Keeps a list of favorited coffee names, persisted to localStorage
 * so the wishlist survives a page refresh.
 */
export const useFavorites = () => {
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // storage unavailable — fail silently, favorites just won't persist
    }
  }, [favorites]);

  const isFavorite = useCallback(
    (name) => favorites.includes(name),
    [favorites]
  );

  const toggleFavorite = useCallback((name) => {
    setFavorites((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }, []);

  const removeFavorite = useCallback((name) => {
    setFavorites((prev) => prev.filter((n) => n !== name));
  }, []);

  return { favorites, isFavorite, toggleFavorite, removeFavorite };
};

export default useFavorites;