import { useState, useRef, useEffect } from 'react';
import { RefreshCw, Sun, Moon, User, Trash2 } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { StationSearchInput } from './StationSearchInput';

export function Header({ 
  onRefresh, 
  isRefreshing,
  stations,
  selectedStation,
  onSelectStation,
  onToggleFavorite,
  isFavorite,
  stationsLoading
}) {
  const { theme, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearData = () => {
    if (confirm('Är du säker på att du vill radera all sparad data? Detta inkluderar favoriter och vald station.')) {
      localStorage.removeItem('sl-monitor-selected-station');
      localStorage.removeItem('sl-monitor-favorites');
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-supported border-b border-[var(--border-subtle)]">
      <div className="container-dynamic h-16 md:h-[72px] flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <svg className="h-7 md:h-8" viewBox="0 0 60.6 48.002" fill="var(--text-primary)">
            <path d="M30.3 41.703a23.845 23.845 0 0 0 16.972-7.03 23.845 23.845 0 0 0 7.03-16.972v-.493h-2.815v.493c0 5.66-2.204 10.98-6.205 14.982A21.049 21.049 0 0 1 30.3 38.888c-5.66 0-10.98-2.203-14.982-6.205A21.048 21.048 0 0 1 9.113 17.7v-.493H6.298v.493a23.844 23.844 0 0 0 7.03 16.972 23.845 23.845 0 0 0 16.972 7.03zm0-38.888c8.208 0 14.886 6.678 14.886 14.886 0 8.209-6.678 14.887-14.886 14.887-8.208 0-14.887-6.678-14.887-14.887 0-8.208 6.679-14.886 14.887-14.886zm0 32.588c4.728 0 9.173-1.842 12.517-5.185A17.586 17.586 0 0 0 48 17.701c0-4.728-1.84-9.173-5.184-12.516A17.586 17.586 0 0 0 30.3 0a17.586 17.586 0 0 0-12.517 5.185A17.586 17.586 0 0 0 12.6 17.7c0 4.729 1.84 9.174 5.184 12.517A17.586 17.586 0 0 0 30.3 35.403zm27.485-18.195v.493c0 7.342-2.859 14.244-8.05 19.435-5.191 5.191-12.094 8.05-19.435 8.05-7.341 0-14.244-2.859-19.435-8.05-5.191-5.191-8.05-12.093-8.05-19.435v-.493H0v.493c0 4.09.801 8.058 2.382 11.795a30.197 30.197 0 0 0 6.493 9.63A30.2 30.2 0 0 0 30.3 48.002a30.2 30.2 0 0 0 21.425-8.875 30.199 30.199 0 0 0 6.493-9.63A30.113 30.113 0 0 0 60.6 17.7v-.493h-2.815zm-17.02 4.213H35.53v-11.22h-3.032v13.926h8.267v-2.706zm-15.191.247c-2.36 0-3.993-1.543-3.993-1.543l-1.686 2.074s2.178 2.12 5.621 2.12c3.07 0 5.055-1.686 5.055-4.294 0-2.732-2.168-3.636-4.511-4.205-2.718-.65-2.85-1.101-2.85-1.843 0-.812.686-1.316 1.791-1.316 1.732 0 3.085 1.013 3.085 1.013l1.707-2.104s-1.748-1.558-4.754-1.558c-2.837 0-4.744 1.678-4.744 4.175 0 2.64 1.71 3.57 4.664 4.284 2.696.623 2.696 1.162 2.696 1.785 0 .87-.798 1.412-2.081 1.412z" fillRule="evenodd"/>
          </svg>
          <div className="h-4 w-px bg-[var(--text-muted)]" />
          <span className="text-[13px] font-medium text-[var(--text-tertiary)] hidden sm:inline">Monitor</span>
        </div>
        
        {/* Station Search */}
        <StationSearchInput
          stations={stations}
          selectedStation={selectedStation}
          onSelectStation={onSelectStation}
          onToggleFavorite={onToggleFavorite}
          isFavorite={isFavorite}
          loading={stationsLoading}
        />
        
        {/* Actions - right side */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 rounded-full flex items-center justify-center
                       text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]
                       disabled:opacity-30 transition-colors"
            title="Uppdatera"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          
          {/* Profile Menu */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-9 h-9 rounded-full flex items-center justify-center
                         text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]
                         transition-colors"
              title="Profil"
            >
              <User className="w-4 h-4" />
            </button>
            
            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-xl shadow-lg overflow-hidden animate-in z-50">
                <button
                  onClick={() => {
                    toggleTheme();
                    setIsProfileOpen(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left
                             hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  {theme === 'light' ? (
                    <>
                      <Moon className="w-4 h-4 text-[var(--text-tertiary)]" />
                      <span className="text-[13px] text-[var(--text-primary)]">Mörkt läge</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4 text-[var(--text-tertiary)]" />
                      <span className="text-[13px] text-[var(--text-primary)]">Ljust läge</span>
                    </>
                  )}
                </button>
                
                <div className="border-t border-[var(--border-subtle)]" />
                
                <button
                  onClick={() => {
                    handleClearData();
                    setIsProfileOpen(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left
                             hover:bg-[var(--bg-elevated)] transition-colors text-[#ff453a]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-[13px]">Rensa data</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
