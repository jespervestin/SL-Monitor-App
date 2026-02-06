// SL API Base URLs
const TRANSPORT_API = 'https://transport.integration.sl.se/v1';
const DEVIATIONS_API = 'https://deviations.integration.sl.se/v1';
const JOURNEY_PLANNER_API = 'https://journeyplanner.integration.sl.se/v2';

/**
 * Fetch all sites (stations) from SL Transport API
 * @returns {Promise<Array>} Array of site objects
 */
export async function fetchSites() {
  const response = await fetch(`${TRANSPORT_API}/sites?expand=true`);
  if (!response.ok) {
    throw new Error(`Failed to fetch sites: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch departures from a specific site
 * @param {number} siteId - The site ID
 * @returns {Promise<Object>} Departures data including departures array and stop_deviations
 */
export async function fetchDepartures(siteId) {
  const response = await fetch(`${TRANSPORT_API}/sites/${siteId}/departures`);
  if (!response.ok) {
    throw new Error(`Failed to fetch departures: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch deviations/service alerts
 * @param {Object} options - Filter options
 * @param {number[]} options.siteIds - Array of site IDs to filter by
 * @param {string[]} options.transportModes - Array of transport modes (TRAIN, METRO, BUS, etc.)
 * @param {number[]} options.lineIds - Array of line IDs to filter by
 * @returns {Promise<Array>} Array of deviation objects
 */
export async function fetchDeviations(options = {}) {
  try {
    const params = new URLSearchParams();
    
    // Add transport modes (default to TRAIN and METRO)
    const modes = options.transportModes || ['TRAIN', 'METRO'];
    modes.forEach(mode => params.append('transport_mode', mode));
    
    // Add site IDs if provided
    if (options.siteIds?.length) {
      options.siteIds.forEach(id => params.append('site', id));
    }
    
    // Add line IDs if provided
    if (options.lineIds?.length) {
      options.lineIds.forEach(id => params.append('line', id));
    }
    
    // Include future deviations
    params.append('future', 'true');
    
    const url = `${DEVIATIONS_API}/messages?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Unknown error';
      }
      throw new Error(`API returned ${response.status}: ${errorText.substring(0, 100)}`);
    }
    
    const data = await response.json();
    // Handle case where API returns an object with a messages array
    const result = Array.isArray(data) ? data : (data.messages || data.data || []);
    return result;
  } catch (err) {
    // Re-throw with more context
    if (err.message.includes('API returned')) {
      throw err;
    }
    throw new Error(`Network error fetching deviations: ${err.message}`);
  }
}

/**
 * Get the color class for a transport line
 * @param {string} transportMode - The transport mode (METRO, TRAIN, BUS, TRAM)
 * @param {string} groupOfLines - The line group name (for metro lines)
 * @returns {string} CSS class name for the line color
 */
export function getLineColorClass(transportMode, groupOfLines) {
  if (transportMode === 'METRO') {
    const group = groupOfLines?.toLowerCase() || '';
    if (group.includes('grön') || group.includes('green')) return 'line-metro-green';
    if (group.includes('röd') || group.includes('red')) return 'line-metro-red';
    if (group.includes('blå') || group.includes('blue')) return 'line-metro-blue';
    return 'bg-purple-500'; // Default metro color
  }
  if (transportMode === 'TRAIN') return 'line-train';
  if (transportMode === 'BUS') return 'line-bus';
  if (transportMode === 'TRAM') return 'line-tram';
  return 'bg-slate-500';
}

/**
 * Format a time string for display
 * @param {string} isoTime - ISO 8601 time string
 * @returns {string} Formatted time (HH:MM)
 */
export function formatTime(isoTime) {
  if (!isoTime) return '--:--';
  const date = new Date(isoTime);
  return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Calculate delay in minutes between scheduled and expected time
 * @param {string} scheduled - Scheduled time (ISO 8601)
 * @param {string} expected - Expected time (ISO 8601)
 * @returns {number} Delay in minutes (positive = late, negative = early)
 */
export function calculateDelay(scheduled, expected) {
  if (!scheduled || !expected) return 0;
  const scheduledDate = new Date(scheduled);
  const expectedDate = new Date(expected);
  return Math.round((expectedDate - scheduledDate) / 60000);
}

/**
 * Get minutes until departure
 * @param {string} expectedTime - Expected departure time (ISO 8601)
 * @returns {number} Minutes until departure
 */
export function getMinutesUntil(expectedTime) {
  if (!expectedTime) return null;
  const now = new Date();
  const expected = new Date(expectedTime);
  return Math.round((expected - now) / 60000);
}

/**
 * Format minutes until departure for display
 * @param {number} minutes - Minutes until departure
 * @returns {string} Formatted display string
 */
export function formatMinutesUntil(minutes) {
  if (minutes === null || minutes === undefined) return '--';
  if (minutes <= 0) return 'Now';
  if (minutes === 1) return '1 min';
  return `${minutes} min`;
}

/**
 * Get transport mode icon name (for Lucide icons)
 * @param {string} transportMode - The transport mode
 * @returns {string} Icon name
 */
export function getTransportIcon(transportMode) {
  switch (transportMode) {
    case 'METRO': return 'train-subway';
    case 'TRAIN': return 'train-front';
    case 'BUS': return 'bus';
    case 'TRAM': return 'tram-front';
    case 'SHIP':
    case 'FERRY': return 'ship';
    default: return 'circle';
  }
}

/**
 * Search for stops/locations using SL Journey Planner API
 * @param {string} query - Search query (stop name or address)
 * @returns {Promise<Array>} Array of location objects
 */
export async function searchStops(query) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      name_sf: query.trim(),
      type_sf: 'any',
      any_obj_filter_sf: '46' // Search stops, streets, addresses, and POIs
    });

    const response = await fetch(`${JOURNEY_PLANNER_API}/stop-finder?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to search stops: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter out error messages and return locations
    if (data.locations && Array.isArray(data.locations)) {
      return data.locations.filter(loc => loc.type === 'stop' || loc.type === 'platform');
    }
    
    return [];
  } catch (error) {
    throw new Error(`Failed to search stops: ${error.message}`);
  }
}

/**
 * Get journey planner location ID for a station by name
 * @param {string} stationName - Station name to search for
 * @returns {Promise<string|null>} Journey planner location ID or null if not found
 */
export async function getJourneyPlannerLocationId(stationName) {
  if (!stationName) return null;

  try {
    const results = await searchStops(stationName);
    // Return the first matching stop's ID
    if (results.length > 0) {
      return results[0].id;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get journey/trip options between two locations
 * @param {Object} options - Trip search options
 * @param {string} options.originId - Origin location ID (from stop-finder)
 * @param {string} options.destinationId - Destination location ID (from stop-finder)
 * @param {number} options.numTrips - Number of trips to return (1-3, default 3)
 * @param {Date} options.departureTime - Optional departure time (defaults to now)
 * @returns {Promise<Object>} Journey data with trips array
 */
export async function searchTrips({ originId, destinationId, numTrips = 3, departureTime = null }) {
  if (!originId || !destinationId) {
    throw new Error('Origin and destination IDs are required');
  }

  try {
    const params = new URLSearchParams({
      type_origin: 'any',
      name_origin: originId,
      type_destination: 'any',
      name_destination: destinationId,
      calc_number_of_trips: Math.min(3, Math.max(1, numTrips)).toString(),
      language: 'sv',
      gen_c: 'true' // Include coordinates
    });

    // Add departure time if provided
    if (departureTime) {
      const timeStr = departureTime.toISOString();
      params.append('departure', timeStr);
    }

    const response = await fetch(`${JOURNEY_PLANNER_API}/trips?${params}`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to search trips: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    
    // Return journeys array (filter out error messages in systemMessages)
    return {
      journeys: data.journeys || [],
      systemMessages: data.systemMessages || []
    };
  } catch (error) {
    throw new Error(`Failed to search trips: ${error.message}`);
  }
}

/**
 * Format duration in seconds to human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "15 min", "1h 30 min")
 */
export function formatDuration(seconds) {
  if (!seconds) return '--';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes} min`;
}
