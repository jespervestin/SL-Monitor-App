import { useState, useEffect, useCallback } from 'react';
import { fetchDeviations } from '../utils/api';

const POLL_INTERVAL = 60000; // 60 seconds

/**
 * Hook to fetch deviations/service alerts with automatic polling
 * @param {Object} station - Selected station object (optional, for filtering)
 * @param {string[]} transportModes - Filter by transport modes
 * @param {Array} departures - Array of departures from the station (for better filtering)
 */
export function useDeviations(station = null, transportModes = ['TRAIN', 'METRO', 'TRAM', 'LIGHT_RAIL'], departures = []) {
  const [deviations, setDeviations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDeviations = useCallback(async () => {
    try {
      setError(null);
      
      const options = {
        transportModes,
      };
      
      // If station is selected, we could filter by site, but the API
      // seems to work better when we fetch all and filter client-side
      // to get relevant deviations for lines passing through the station
      
      const data = await fetchDeviations(options);
      
      // Ensure data is an array
      const deviationsArray = Array.isArray(data) ? data : [];
      
      // Filter out elevator-related alerts (Avstängd hiss)
      const filteredDeviations = deviationsArray.filter(deviation => {
        const message = deviation.message_variants?.find(v => v.language === 'sv') 
          || deviation.message_variants?.[0] || {};
        const header = message.header || '';
        // Exclude alerts about elevators being out of service
        return !header.toLowerCase().includes('avstängd hiss');
      });
      
      // Sort by priority (importance_level, lower is more important)
      const sortedDeviations = filteredDeviations.sort((a, b) => {
        const priorityA = a.priority?.importance_level || 5;
        const priorityB = b.priority?.importance_level || 5;
        return priorityA - priorityB;
      });
      
      setDeviations(sortedDeviations);
      setLastUpdated(new Date());
      setError(null); // Clear any previous errors
    } catch (err) {
      setError(err.message);
      setDeviations([]); // Set empty array on error
    }
  }, [transportModes.join(',')]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadDeviations().finally(() => setLoading(false));
  }, [loadDeviations]);

  // Polling
  useEffect(() => {
    const interval = setInterval(() => {
      loadDeviations();
    }, POLL_INTERVAL);
    
    return () => clearInterval(interval);
  }, [loadDeviations]);

  // Filter deviations relevant to the selected station
  const stationDeviations = useCallback(() => {
    if (!station) return deviations;
    
    // Get line IDs and designations that actually serve this station (from departures)
    const servingLineIds = new Set(
      departures
        .map(dep => dep.line?.id)
        .filter(Boolean)
    );
    const servingLineDesignations = new Set(
      departures
        .map(dep => dep.line?.designation)
        .filter(Boolean)
    );
    
    // If we have no departures yet, show all deviations for the transport modes
    // (they might be relevant once departures load)
    if (departures.length === 0) {
      return deviations;
    }
    
    return deviations.filter(deviation => {
      // Check if any of the deviation's stop areas match the station's stop areas
      const deviationStopAreas = deviation.scope?.stop_areas || [];
      const stationStopAreas = station.stop_areas || [];
      
      // Handle both object and ID formats
      const stopAreaMatch = deviationStopAreas.length > 0 && 
        deviationStopAreas.some(dsa => {
          const dsaId = typeof dsa === 'object' ? dsa.id : dsa;
          return stationStopAreas.some(sa => {
            const saId = typeof sa === 'object' ? sa.id : sa;
            return saId === dsaId;
          });
        });
      
      // Check if the deviation affects lines that actually serve this station
      const deviationLines = deviation.scope?.lines || [];
      const lineMatch = deviationLines.length > 0 && 
        deviationLines.some(line => {
          // Match by ID or designation
          return servingLineIds.has(line.id) || 
                 servingLineDesignations.has(line.designation);
        });
      
      // Show if it matches stop areas OR affects lines serving the station
      // OR if it has no specific scope (general alerts)
      const hasNoSpecificScope = (!deviationStopAreas.length && !deviationLines.length);
      
      return stopAreaMatch || lineMatch || hasNoSpecificScope;
    });
  }, [station, deviations, departures]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadDeviations();
    setLoading(false);
  }, [loadDeviations]);

  return {
    deviations,
    stationDeviations: stationDeviations(),
    loading,
    error,
    lastUpdated,
    refresh,
  };
}
