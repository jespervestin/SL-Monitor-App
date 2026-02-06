import { useState } from 'react';
import { useStations } from './hooks/useStations';
import { useDepartures } from './hooks/useDepartures';
import { useDeviations } from './hooks/useDeviations';
import { useJourneyPlanner } from './hooks/useJourneyPlanner';
import { Header } from './components/Header';
import { StationSearch } from './components/StationSearch';
import { DepartureBoard } from './components/DepartureBoard';
import { DeviationsList } from './components/DeviationsList';
import { AISummary } from './components/AISummary';
import { JourneyPlanner } from './components/JourneyPlanner';

function App() {
  const { stations, selectedStation, selectStation, favorites, toggleFavorite, isFavorite, loading: stationsLoading } = useStations();
  const { departures, stopDeviations, loading: departuresLoading, error: departuresError, lastUpdated: departuresUpdated, refresh: refreshDepartures } = useDepartures(selectedStation);
  // For deviations API, use only TRAIN and METRO (API might not support all modes)
  const { deviations, stationDeviations, loading: deviationsLoading, error: deviationsError, lastUpdated: deviationsUpdated, refresh: refreshDeviations } = useDeviations(selectedStation, ['TRAIN', 'METRO'], departures);
  
  // Journey planner state
  const [destinationStation, setDestinationStation] = useState(null);
  const { trips, loading: tripsLoading, error: tripsError, lastUpdated: tripsUpdated, refresh: refreshTrips } = useJourneyPlanner(selectedStation, destinationStation);


  const handleRefresh = async () => {
    await Promise.all([refreshDepartures(), refreshDeviations()]);
  };

  const hasAlerts = selectedStation ? stationDeviations.length > 0 : deviations.length > 0;

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <Header 
        onRefresh={handleRefresh} 
        isRefreshing={departuresLoading || deviationsLoading}
        stations={stations}
        selectedStation={selectedStation}
        onSelectStation={selectStation}
        onToggleFavorite={toggleFavorite}
        isFavorite={isFavorite}
        stationsLoading={stationsLoading}
      />
      
      <main className="flex-1 container-dynamic py-4 md:py-6 flex flex-col min-h-0 overflow-hidden">
        {/* Station selector - shows selected station and favorites */}
        <div className="shrink-0 mb-4 md:mb-5 overflow-visible relative z-10">
          <StationSearch
            selectedStation={selectedStation}
            onSelectStation={selectStation}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            isFavorite={isFavorite}
            loading={stationsLoading}
            destinationStation={destinationStation}
            onSelectDestination={setDestinationStation}
          />
        </div>
        
        {selectedStation ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 md:space-y-5">
            {/* AI Summary - compact on mobile */}
            <div className="shrink-0">
              <AISummary
                departures={departures}
                deviations={stationDeviations}
                stopDeviations={stopDeviations}
                station={selectedStation}
                destinationStation={destinationStation}
                isDataLoading={departuresLoading || deviationsLoading}
              />
            </div>

            {/* Journey Planner - show if destination is selected */}
            {destinationStation && (
              <div className="shrink-0">
                <JourneyPlanner
                  trips={trips}
                  loading={tripsLoading}
                  error={tripsError}
                  lastUpdated={tripsUpdated}
                  onRefresh={refreshTrips}
                  originStation={selectedStation}
                  destinationStation={destinationStation}
                />
              </div>
            )}

            {/* Dynamic grid - adapts to screen size - hide when viewing trips */}
            {!destinationStation && (
              <div className="flex-1 grid gap-4 md:gap-5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1.2fr,1fr] 2xl:grid-cols-[1.4fr,1fr] min-h-0">
                <DepartureBoard
                  departures={departures}
                  stopDeviations={stopDeviations}
                  loading={departuresLoading}
                  error={departuresError}
                  lastUpdated={departuresUpdated}
                />
                
                <DeviationsList
                  deviations={deviations}
                  stationDeviations={stationDeviations}
                  loading={deviationsLoading}
                  error={deviationsError}
                  lastUpdated={deviationsUpdated}
                  selectedStation={selectedStation}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 md:space-y-5">
            {/* Show alerts even without station selected */}
            {deviations.length > 0 && (
              <div className="flex-1 min-h-0">
                <DeviationsList
                  deviations={deviations}
                  stationDeviations={deviations}
                  loading={deviationsLoading}
                  error={deviationsError}
                  lastUpdated={deviationsUpdated}
                  selectedStation={null}
                />
              </div>
            )}
          </div>
        )}
      </main>
      
      <footer className="shrink-0 safe-bottom py-3 border-t border-[var(--border-subtle)]">
        <div className="container-dynamic">
          <p className="text-center text-xs text-[var(--text-muted)]">
            Data from <a href="https://www.trafiklab.se" target="_blank" rel="noopener noreferrer" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">Trafiklab</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
