import { Star, Train, ChevronRight, Loader2, X, MapPin, ArrowRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { searchStops } from '../utils/api';

export function StationSearch({ 
  selectedStation, 
  onSelectStation,
  favorites,
  onToggleFavorite,
  isFavorite,
  loading,
  destinationStation,
  onSelectDestination
}) {
  const handleFavoriteClick = (e, station) => {
    e.stopPropagation();
    onToggleFavorite(station);
  };

  const selectStation = (station) => {
    onSelectStation(station);
  };

  // Destination search state
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destinationResults, setDestinationResults] = useState([]);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [isLoadingDestination, setIsLoadingDestination] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const destinationInputRef = useRef(null);
  const destinationContainerRef = useRef(null);

  // Update dropdown position when input is focused or query changes
  useEffect(() => {
    if (isSearchingDestination && destinationInputRef.current) {
      const updatePosition = () => {
        if (!destinationInputRef.current) return;
        const rect = destinationInputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      };
      
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      // Reset position when not searching
      setDropdownPosition({ top: 0, left: 0, width: 0 });
    }
  }, [isSearchingDestination, destinationQuery]);

  // Search for destination stops
  useEffect(() => {
    if (destinationQuery.trim().length < 2) {
      setDestinationResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoadingDestination(true);
      try {
        const results = await searchStops(destinationQuery);
        setDestinationResults(results);
      } catch (error) {
        console.error('Error searching destination:', error);
        setDestinationResults([]);
      } finally {
        setIsLoadingDestination(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [destinationQuery]);

  // Close destination dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target) return;
      
      // Don't close if clicking inside the dropdown portal
      const dropdown = event.target.closest('[data-destination-dropdown]');
      if (dropdown) {
        return;
      }
      
      // Don't close if clicking on the input
      if (destinationInputRef.current && destinationInputRef.current.contains(event.target)) {
        return;
      }
      
      // Close if clicking outside both the container and the dropdown
      if (destinationContainerRef.current && 
          !destinationContainerRef.current.contains(event.target)) {
        setIsSearchingDestination(false);
      }
    };
    
    // Use mouseup instead of mousedown to allow button clicks to register first
    document.addEventListener('mouseup', handleClickOutside);
    return () => document.removeEventListener('mouseup', handleClickOutside);
  }, []);

  const selectDestination = (location) => {
    // Keep the journey planner location format (includes the ID we need)
    if (location && location.id) {
      onSelectDestination(location);
      setDestinationQuery('');
      setIsSearchingDestination(false);
      if (destinationInputRef.current) {
        destinationInputRef.current.blur();
      }
    }
  };

  // Clear destination query when destination is cleared
  useEffect(() => {
    if (!destinationStation) {
      setDestinationQuery('');
      setIsSearchingDestination(false);
    }
  }, [destinationStation]);

  if (loading) {
    return (
      <div className="card p-4 md:p-5">
        <div className="flex items-center gap-3 text-[var(--text-tertiary)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Laddar stationer...</span>
        </div>
      </div>
    );
  }

  // Show selected station card
  if (selectedStation) {
    return (
      <div className="card overflow-hidden">
        <div className="p-4 md:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-8 md:h-10 rounded-full bg-[#2870f0] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[16px] md:text-[18px] text-[var(--text-primary)] truncate">{selectedStation.name}</p>
              {selectedStation.abbreviation && (
                <p className="text-[12px] md:text-[13px] text-[var(--text-tertiary)] mt-0.5">
                  {selectedStation.abbreviation}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick favorites bar */}
            {favorites.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {favorites.filter(f => f.id !== selectedStation.id).slice(0, 4).map(station => (
                  <button
                    key={station.id}
                    onClick={() => selectStation(station)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg 
                               bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] active:bg-[var(--bg-card)]
                               border border-[var(--border-subtle)] whitespace-nowrap transition-colors"
                  >
                    <Star className="w-3 h-3 fill-[#ff9f0a] text-[#ff9f0a]" />
                    <span className="text-[12px] font-medium text-[var(--text-secondary)]">{station.name}</span>
                  </button>
                ))}
              </div>
            )}
            
            <button
              onClick={(e) => handleFavoriteClick(e, selectedStation)}
              className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] flex items-center justify-center transition-colors shrink-0"
            >
              <Star 
                className={`w-4 h-4 md:w-5 md:h-5 ${isFavorite(selectedStation.id) ? 'fill-[#ff9f0a] text-[#ff9f0a]' : 'text-[var(--text-muted)]'}`} 
              />
            </button>
          </div>
        </div>
        
        {/* Destination selector */}
        <div className="px-4 md:px-5 py-2.5 md:py-3 border-t border-[var(--border-subtle)] relative overflow-visible">
            {/* Destination selector */}
            <div className="max-w-md">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ArrowRight className="w-3 h-3 text-[var(--text-tertiary)]" />
                <p className="text-[10px] md:text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Välj destination
                </p>
              </div>
              <div ref={destinationContainerRef} className="relative z-10 overflow-visible">
                {!destinationStation ? (
                  <>
                    <div className="relative max-w-md">
                      <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
                      <input
                        ref={destinationInputRef}
                        type="text"
                        value={destinationQuery}
                        onChange={(e) => { setDestinationQuery(e.target.value); setIsSearchingDestination(true); }}
                        onFocus={() => setIsSearchingDestination(true)}
                        placeholder="Sök destination..."
                        className="w-full h-8 pl-8 pr-8 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg
                                   text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] 
                                   focus:bg-[var(--bg-card)] focus:border-[var(--border-light)] focus:outline-none transition-colors"
                      />
                      {destinationQuery && (
                        <button
                          onClick={() => { setDestinationQuery(''); setIsSearchingDestination(false); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--bg-elevated)]"
                        >
                          <X className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        </button>
                      )}
                    </div>
                    
                    {/* Destination search results - rendered via portal */}
                    {isSearchingDestination && destinationQuery.length >= 2 && typeof document !== 'undefined' && document.body && createPortal(
                      <div 
                        data-destination-dropdown
                        className="fixed z-[9999] bg-[var(--bg-card)] border border-[var(--border-light)] 
                                   rounded-xl shadow-lg overflow-hidden animate-in max-h-[300px] overflow-y-auto"
                        style={{
                          top: `${dropdownPosition.top}px`,
                          left: `${dropdownPosition.left}px`,
                          width: `${dropdownPosition.width}px`
                        }}
                      >
                        {isLoadingDestination ? (
                          <div className="px-4 py-3 text-center text-[var(--text-tertiary)] text-sm">
                            Söker...
                          </div>
                        ) : destinationResults.length > 0 ? (
                          destinationResults.map((location) => (
                            <button
                              key={location.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                selectDestination(location);
                              }}
                              className="w-full px-3 py-2.5 text-left flex items-center gap-2.5
                                          border-b border-[var(--border-subtle)] last:border-0
                                          hover:bg-[var(--bg-elevated)] transition-colors"
                            >
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--bg-elevated)]">
                                <MapPin className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                              </div>
                              <span className="flex-1 text-[13px] font-medium text-[var(--text-secondary)]">
                                {location.name || location.disassembledName}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-center text-[var(--text-tertiary)] text-sm">
                            Inga resultat hittades
                          </div>
                        )}
                      </div>,
                      document.body
                    )}
                  </>
                ) : (
                  /* Selected destination display */
                  <div className="py-1.5 px-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center gap-2 max-w-md">
                    <MapPin className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                    <span className="flex-1 text-[13px] font-medium text-[var(--text-secondary)] truncate">
                      {destinationStation.name || destinationStation.disassembledName}
                    </span>
                    <button
                      onClick={() => {
                        onSelectDestination(null);
                        setDestinationQuery('');
                        setIsSearchingDestination(false);
                      }}
                      className="p-1 rounded hover:bg-[var(--bg-card)] transition-colors"
                      title="Rensa destination"
                    >
                      <X className="w-3 h-3 text-[var(--text-tertiary)]" />
                    </button>
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    );
  }

  // No station selected - show favorites if available
  if (favorites.length > 0) {
    return (
      <div className="card overflow-hidden">
        <div className="px-3.5 md:px-4 py-3 border-b border-[var(--border-subtle)]">
          <p className="text-[10px] md:text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Favoriter
          </p>
        </div>
        <div className="p-3.5 md:p-4 pt-5 md:pt-6">
          <div className="grid grid-cols-2 gap-2">
            {favorites.map(station => (
              <button
                key={station.id}
                onClick={() => selectStation(station)}
                className="group relative flex items-center gap-2 md:gap-2.5 p-2.5 md:p-3 rounded-xl border transition-all
                           bg-[var(--bg-elevated)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] active:bg-[var(--bg-card)]"
              >
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#ff9f0a]/15">
                  <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-[#ff9f0a] text-[#ff9f0a]" />
                </div>
                <span className="flex-1 text-left text-[12px] md:text-[13px] font-medium truncate text-[var(--text-secondary)]">
                  {station.name}
                </span>
                <button
                  onClick={(e) => handleFavoriteClick(e, station)}
                  className="absolute top-1 right-1 p-1 rounded-md opacity-0 group-hover:opacity-100 
                             hover:bg-[var(--bg-elevated)] transition-opacity"
                >
                  <X className="w-3 h-3 text-[var(--text-tertiary)]" />
                </button>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No station and no favorites - show welcome message
  return null;
}
