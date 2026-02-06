import { useState, useEffect, useCallback } from 'react';
import { searchTrips, getJourneyPlannerLocationId } from '../utils/api';

/**
 * Hook for managing journey planner state and fetching trips
 * Accepts station objects and handles ID lookup internally
 */
export function useJourneyPlanner(originStation, destinationStation) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [originId, setOriginId] = useState(null);
  const [destinationId, setDestinationId] = useState(null);

  // Get journey planner IDs for both stations
  useEffect(() => {
    async function fetchIds() {
      if (!originStation || !destinationStation) {
        setOriginId(null);
        setDestinationId(null);
        return;
      }

      try {
        // If destination already has an ID (from journey planner search), use it
        // Otherwise, search for it
        const destinationIdValue = destinationStation.id || await getJourneyPlannerLocationId(destinationStation.name || destinationStation.disassembledName);
        
        // Origin station needs to be searched (it comes from Transport API)
        const originIdValue = await getJourneyPlannerLocationId(originStation.name);
        
        setOriginId(originIdValue);
        setDestinationId(destinationIdValue);
      } catch (err) {
        console.error('Error fetching journey planner IDs:', err);
        setOriginId(null);
        setDestinationId(null);
      }
    }

    fetchIds();
  }, [originStation, destinationStation]);

  const fetchTrips = useCallback(async () => {
    if (!originId || !destinationId) {
      setTrips([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await searchTrips({
        originId,
        destinationId,
        numTrips: 3
      });

      setTrips(result.journeys || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching trips:', err);
      setError(err.message);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [originId, destinationId]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return {
    trips,
    loading,
    error,
    lastUpdated,
    refresh: fetchTrips
  };
}
