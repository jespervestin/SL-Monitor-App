import { useState, useEffect, useMemo } from 'react';
import { fetchSites } from '../utils/api';

const STORAGE_KEY = 'sl-monitor-selected-station';
const FAVORITES_KEY = 'sl-monitor-favorites';

/**
 * Hook to fetch and manage stations, with localStorage persistence
 */
export function useStations() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load stations on mount
  useEffect(() => {
    async function loadStations() {
      try {
        setLoading(true);
        setError(null);
        const sites = await fetchSites();
        
        // Sort stations alphabetically by name
        const sortedSites = sites.sort((a, b) => 
          a.name.localeCompare(b.name, 'sv')
        );
        
        setStations(sortedSites);
        
        // Restore favorites from localStorage
        const savedFavorites = localStorage.getItem(FAVORITES_KEY);
        if (savedFavorites) {
          try {
            const favoriteIds = JSON.parse(savedFavorites);
            const favoriteStations = favoriteIds
              .map(id => sortedSites.find(s => s.id === id))
              .filter(Boolean);
            setFavorites(favoriteStations);
          } catch (e) {
            console.error('Failed to parse favorites:', e);
          }
        }
        
        // Restore selected station from localStorage
        const savedStationId = localStorage.getItem(STORAGE_KEY);
        if (savedStationId) {
          const saved = sortedSites.find(s => s.id === parseInt(savedStationId));
          if (saved) {
            setSelectedStation(saved);
          }
        }
      } catch (err) {
        setError(err.message);
        console.error('Failed to load stations:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadStations();
  }, []);

  // Persist selected station to localStorage
  const selectStation = (station) => {
    setSelectedStation(station);
    if (station) {
      localStorage.setItem(STORAGE_KEY, station.id.toString());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Add station to favorites
  const addFavorite = (station) => {
    if (!station || favorites.some(f => f.id === station.id)) return;
    
    const newFavorites = [...favorites, station];
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites.map(f => f.id)));
  };

  // Remove station from favorites
  const removeFavorite = (stationId) => {
    const newFavorites = favorites.filter(f => f.id !== stationId);
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites.map(f => f.id)));
  };

  // Check if station is favorite
  const isFavorite = (stationId) => {
    return favorites.some(f => f.id === stationId);
  };

  // Toggle favorite status
  const toggleFavorite = (station) => {
    if (isFavorite(station.id)) {
      removeFavorite(station.id);
    } else {
      addFavorite(station);
    }
  };

  return {
    stations,
    selectedStation,
    selectStation,
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    loading,
    error,
  };
}
