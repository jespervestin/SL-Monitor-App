import { useState, useEffect, useCallback } from 'react';
import { fetchDepartures } from '../utils/api';

const POLL_INTERVAL = 30000; // 30 seconds

/**
 * Hook to fetch departures from a station with automatic polling
 * @param {Object} station - Selected station object
 * @param {string[]} transportModes - Filter by transport modes (optional)
 */
export function useDepartures(station, transportModes = ['TRAIN', 'METRO', 'TRAM', 'LIGHT_RAIL']) {
  const [departures, setDepartures] = useState([]);
  const [stopDeviations, setStopDeviations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDepartures = useCallback(async () => {
    if (!station?.id) {
      setDepartures([]);
      setStopDeviations([]);
      return;
    }

    try {
      setError(null);
      const data = await fetchDepartures(station.id);
      
      // Filter departures by transport mode
      const filteredDepartures = (data.departures || []).filter(dep => 
        transportModes.includes(dep.line?.transport_mode)
      );
      
      // Sort by expected time
      filteredDepartures.sort((a, b) => {
        const timeA = new Date(a.expected || a.scheduled);
        const timeB = new Date(b.expected || b.scheduled);
        return timeA - timeB;
      });
      
      setDepartures(filteredDepartures);
      setStopDeviations(data.stop_deviations || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    }
  }, [station?.id, transportModes.join(',')]);

  // Initial load
  useEffect(() => {
    if (station?.id) {
      setLoading(true);
      loadDepartures().finally(() => setLoading(false));
    }
  }, [station?.id, loadDepartures]);

  // Polling
  useEffect(() => {
    if (!station?.id) return;
    
    const interval = setInterval(() => {
      loadDepartures();
    }, POLL_INTERVAL);
    
    return () => clearInterval(interval);
  }, [station?.id, loadDepartures]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadDepartures();
    setLoading(false);
  }, [loadDepartures]);

  return {
    departures,
    stopDeviations,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}
