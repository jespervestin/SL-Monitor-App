import { AlertTriangle, Loader2, ArrowRight, Clock, RefreshCw } from 'lucide-react';
import { formatTime, formatDuration, getLineColorClass } from '../utils/api';

function TripLeg({ leg, isFirst }) {
  const transport = leg.transportation;
  
  // Skip walking legs (no transportation)
  if (!transport) {
    return null;
  }
  
  const productClass = transport?.product?.class || 0;
  const transportName = transport?.name || '';
  const productName = transport?.product?.name || '';
  
  // Detect transport mode - check product class first, then name for keywords
  let transportMode = 'TRAIN'; // Default
  const nameLower = (transportName + ' ' + productName).toLowerCase();
  
  if (productClass === 2 || nameLower.includes('tunnelbana') || nameLower.includes('metro')) {
    transportMode = 'METRO';
  } else if (productClass === 5 || productClass === 4 || nameLower.includes('buss') || nameLower.includes('bus')) {
    transportMode = 'BUS';
  } else if (productClass === 3 || nameLower.includes('spårvagn') || nameLower.includes('tram')) {
    transportMode = 'TRAM';
  } else if (productClass === 1 || nameLower.includes('pendeltåg') || nameLower.includes('train')) {
    transportMode = 'TRAIN';
  }
  
  // Extract line number - comprehensive check of all possible fields
  // Check in order of reliability: direct fields > nested fields > parsed from name
  
  // 1. Check direct transport fields first (most reliable)
  let lineNumber = transport?.disassembledName || 
                   transport?.number || 
                   transport?.line || 
                   transport?.designation;
  
  // 2. Check product-level fields
  if (!lineNumber) {
    lineNumber = transport?.product?.number ||
                 transport?.product?.line ||
                 transport?.product?.designation;
  }
  
  // 3. Check leg-level fields (sometimes line info is at leg level)
  if (!lineNumber) {
    lineNumber = leg?.line ||
                 leg?.designation ||
                 leg?.transportation?.disassembledName || 
                 leg?.transportation?.number ||
                 leg?.transportation?.line;
  }
  
  // 4. Parse from transport name - try multiple strategies
  if (!lineNumber && transportName) {
    // Strategy A: Match numbers after transport keywords (e.g., "Tunnelbana 17", "Buss 4")
    const keywordPatterns = [
      /(?:tunnelbana|metro|buss|bus|spårvagn|tram|pendeltåg|train|line|linje)\s+(\d+)/i,
      /(\d+)\s*(?:tunnelbana|metro|buss|bus|spårvagn|tram|pendeltåg|train|line|linje)/i,
      /(?:^|\s)(\d{1,3})(?:\s|$)/, // Standalone 1-3 digit number
    ];
    
    for (const pattern of keywordPatterns) {
      const match = transportName.match(pattern);
      if (match && match[1]) {
        lineNumber = match[1];
        break;
      }
    }
    
    // Strategy B: Split and check parts (common pattern: "Tunnelbana 17" -> ["Tunnelbana", "17"])
    if (!lineNumber) {
      const parts = transportName.trim().split(/[\s\-]+/);
      // Check last part first (most common: "Tunnelbana 17")
      const lastPart = parts[parts.length - 1];
      if (/^\d+$/.test(lastPart)) {
        lineNumber = lastPart;
      } else if (parts.length > 1) {
        // Check second-to-last (e.g., "Line 17 Express")
        const secondLast = parts[parts.length - 2];
        if (/^\d+$/.test(secondLast)) {
          lineNumber = secondLast;
        }
      }
    }
    
    // Strategy C: Find any number in the name (last resort for name parsing)
    if (!lineNumber) {
      const numbers = transportName.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        // Prefer shorter numbers (line numbers are usually 1-3 digits, not years/dates)
        const shortNumbers = numbers.filter(n => n.length <= 3);
        lineNumber = shortNumbers.length > 0 ? shortNumbers[0] : numbers[0];
      }
    }
  }
  
  // 5. Check product name
  if (!lineNumber && productName) {
    const productNumbers = productName.match(/\d+/g);
    if (productNumbers && productNumbers.length > 0) {
      const shortNumbers = productNumbers.filter(n => n.length <= 3);
      lineNumber = shortNumbers.length > 0 ? shortNumbers[0] : productNumbers[0];
    }
  }
  
  // 6. Check all nested objects recursively (deep search)
  if (!lineNumber) {
    const deepSearch = (obj, depth = 0) => {
      if (depth > 3 || !obj || typeof obj !== 'object') return null;
      
      // Check common field names
      const fields = ['number', 'line', 'designation', 'disassembledName', 'id'];
      for (const field of fields) {
        if (obj[field] && typeof obj[field] === 'string' && /^\d+$/.test(obj[field])) {
          return obj[field];
        }
      }
      
      // Recursively search nested objects
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
          const result = deepSearch(obj[key], depth + 1);
          if (result) return result;
        }
      }
      return null;
    };
    
    lineNumber = deepSearch(transport) || deepSearch(leg);
  }
  
  // Final fallback - only show "?" if absolutely nothing found
  if (!lineNumber) {
    lineNumber = '?';
  }
  
  const lineColor = getLineColorClass(transportMode, transport?.name);
  
  const departureTime = leg.origin?.departureTimeEstimated || leg.origin?.departureTimePlanned;
  const arrivalTime = leg.destination?.arrivalTimeEstimated || leg.destination?.arrivalTimePlanned;
  
  const originName = leg.origin?.parent?.disassembledName || leg.origin?.disassembledName || leg.origin?.name || 'Unknown';
  const destinationName = leg.destination?.parent?.disassembledName || leg.destination?.disassembledName || leg.destination?.name || 'Unknown';
  
  const isDelayed = leg.origin?.departureTimeEstimated && leg.origin?.departureTimePlanned &&
    new Date(leg.origin.departureTimeEstimated) > new Date(leg.origin.departureTimePlanned);

  return (
    <div className={`flex items-center gap-3 ${isFirst ? '' : 'mt-3 pt-3 border-t border-[var(--border-subtle)]'}`}>
      {/* Line badge */}
      <div className={`${lineColor} w-10 h-7 rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0`}>
        {lineNumber}
      </div>
      
      {/* Route info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] md:text-[14px] font-medium text-[var(--text-primary)] truncate">
            {originName}
          </span>
          <ArrowRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
          <span className="text-[13px] md:text-[14px] font-medium text-[var(--text-primary)] truncate">
            {destinationName}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {formatTime(departureTime)}
          </span>
          {isDelayed && (
            <span className="text-[10px] text-[#ff9f0a]">
              (Försenad)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TripCard({ trip, index }) {
  const firstLeg = trip.legs?.[0];
  const lastLeg = trip.legs?.[trip.legs.length - 1];
  
  const departureTime = firstLeg?.origin?.departureTimeEstimated || firstLeg?.origin?.departureTimePlanned;
  const arrivalTime = lastLeg?.destination?.arrivalTimeEstimated || lastLeg?.destination?.arrivalTimePlanned;
  
  const duration = trip.tripRtDuration || trip.tripDuration;
  const interchanges = trip.interchanges || 0;
  
  const originName = firstLeg?.origin?.parent?.disassembledName || firstLeg?.origin?.disassembledName || firstLeg?.origin?.name || 'Unknown';
  const destinationName = lastLeg?.destination?.parent?.disassembledName || lastLeg?.destination?.disassembledName || lastLeg?.destination?.name || 'Unknown';

  return (
    <div className="card overflow-hidden">
      <div className="p-4 md:p-5">
        {/* Header with times */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px] md:text-[15px] font-semibold text-[var(--text-primary)] truncate">
                {originName}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <span className="text-[14px] md:text-[15px] font-semibold text-[var(--text-primary)] truncate">
                {destinationName}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                <span className="text-[12px] text-[var(--text-secondary)]">
                  {formatTime(departureTime)} - {formatTime(arrivalTime)}
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-tertiary)]">
                {formatDuration(duration)}
              </span>
              {interchanges > 0 && (
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {interchanges} {interchanges === 1 ? 'byte' : 'byten'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Legs */}
        <div className="space-y-0">
          {trip.legs?.filter(leg => leg.transportation).map((leg, legIndex, filteredLegs) => (
            <TripLeg 
              key={legIndex} 
              leg={leg} 
              isFirst={legIndex === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function JourneyPlanner({ trips, loading, error, lastUpdated, onRefresh, originStation, destinationStation }) {
  if (!originStation || !destinationStation) {
    return null;
  }

  const destinationName = destinationStation.name || destinationStation.disassembledName || 'Unknown';

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] md:text-[18px] font-semibold text-[var(--text-primary)]">
            Reseförslag
          </h2>
          <p className="text-[12px] md:text-[13px] text-[var(--text-tertiary)] mt-0.5">
            {originStation.name} → {destinationName}
          </p>
        </div>
        {lastUpdated && !loading && (
          <button
            onClick={onRefresh}
            className="w-8 h-8 rounded-full flex items-center justify-center
                       text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]
                       transition-colors"
            title="Uppdatera"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[#ff453a] text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Kunde inte ladda resförslag: {error}</span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="card p-5">
          <div className="flex items-center justify-center gap-2 text-[var(--text-tertiary)] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Laddar resförslag...</span>
          </div>
        </div>
      )}

      {/* No trips */}
      {!loading && !error && trips.length === 0 && (
        <div className="card p-5">
          <div className="text-center text-[var(--text-tertiary)] text-sm">
            Inga resförslag hittades
          </div>
        </div>
      )}

      {/* Trip cards */}
      {!loading && !error && trips.length > 0 && (
        <div className="space-y-3 md:space-y-4">
          {trips.map((trip, index) => (
            <TripCard key={trip.tripId || index} trip={trip} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
