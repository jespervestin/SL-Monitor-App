import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X, Star } from 'lucide-react';

export function StationSearchInput({ 
  stations, 
  selectedStation, 
  onSelectStation,
  onToggleFavorite,
  isFavorite,
  loading 
}) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);

  const filteredStations = query.length >= 2
    ? stations.filter(station =>
        station.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.querySelectorAll('[data-station]');
      items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e) => {
    if (!isSearching || filteredStations.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < filteredStations.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredStations[highlightedIndex]) selectStation(filteredStations[highlightedIndex]);
        break;
      case 'Escape':
        setIsSearching(false);
        setQuery('');
        inputRef.current?.blur();
        break;
    }
  };

  const selectStation = (station) => {
    onSelectStation(station);
    setQuery('');
    setIsSearching(false);
    inputRef.current?.blur();
  };

  const handleFavoriteClick = (e, station) => {
    e.stopPropagation();
    onToggleFavorite(station);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsSearching(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) return null;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsSearching(true); }}
          onFocus={() => setIsSearching(true)}
          onKeyDown={handleKeyDown}
          placeholder="Sök station..."
          className="w-full h-9 pl-9 pr-9 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg
                     text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] 
                     focus:bg-[var(--bg-card)] focus:border-[var(--border-light)] focus:outline-none transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsSearching(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--bg-elevated)]"
          >
            <X className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          </button>
        )}
      </div>
      
      {/* Search Results Dropdown */}
      {isSearching && filteredStations.length > 0 && (
        <ul
          ref={listRef}
          className="absolute left-0 right-0 z-50 mt-2 bg-[var(--bg-card)] border border-[var(--border-light)] 
                     rounded-xl shadow-lg overflow-hidden animate-in max-h-[300px] overflow-y-auto"
        >
          {filteredStations.map((station, index) => (
            <li
              key={station.id}
              data-station
              onClick={() => selectStation(station)}
              className={`px-3 py-2.5 cursor-pointer flex items-center gap-2.5
                          border-b border-[var(--border-subtle)] last:border-0 ${
                index === highlightedIndex 
                  ? 'bg-[#2870f0]/15' 
                  : 'hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                index === highlightedIndex ? 'bg-[#2870f0]/20' : 'bg-[var(--bg-elevated)]'
              }`}>
                <MapPin className={`w-3.5 h-3.5 ${index === highlightedIndex ? 'text-[#2870f0]' : 'text-[var(--text-tertiary)]'}`} />
              </div>
              <span className={`flex-1 text-[13px] font-medium ${
                index === highlightedIndex ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
              }`}>
                {station.name}
              </span>
              <button
                onClick={(e) => handleFavoriteClick(e, station)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)]"
              >
                <Star className={`w-3.5 h-3.5 ${isFavorite(station.id) ? 'fill-[#ff9f0a] text-[#ff9f0a]' : 'text-[var(--text-muted)]'}`} />
              </button>
            </li>
          ))}
        </ul>
      )}
      
      {isSearching && query.length >= 2 && filteredStations.length === 0 && (
        <div className="absolute left-0 right-0 z-50 mt-2 bg-[var(--bg-card)] border border-[var(--border-light)] 
                       rounded-xl p-5 text-center animate-in">
          <MapPin className="w-7 h-7 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-[13px] text-[var(--text-tertiary)]">Inga stationer hittades</p>
        </div>
      )}
    </div>
  );
}
