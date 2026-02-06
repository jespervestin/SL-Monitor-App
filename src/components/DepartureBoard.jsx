import { AlertTriangle, Loader2, Clock } from 'lucide-react';
import { 
  formatTime, 
  calculateDelay, 
  getMinutesUntil, 
  formatMinutesUntil,
  getLineColorClass 
} from '../utils/api';

function DepartureRow({ departure, isFirst }) {
  const delay = calculateDelay(departure.scheduled, departure.expected);
  const minutesUntil = getMinutesUntil(departure.expected || departure.scheduled);
  const lineColor = getLineColorClass(departure.line?.transport_mode, departure.line?.group_of_lines);
  const isDelayed = delay >= 2;
  const isCancelled = departure.state === 'CANCELLED';
  const isImminent = minutesUntil !== null && minutesUntil <= 2;

  return (
    <div className={`flex items-center gap-3 py-3 md:py-3.5 ${
      isFirst ? '' : 'border-t border-[var(--border-subtle)]'
    } ${isCancelled ? 'opacity-40' : ''}`}>
      {/* Line badge */}
      <div className={`${lineColor} w-10 h-7 md:w-11 md:h-8 rounded-lg flex items-center justify-center 
                       font-bold text-white text-sm`}>
        {departure.line?.designation || '?'}
      </div>
      
      {/* Destination and info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[14px] md:text-[15px] text-[var(--text-primary)] truncate">
          {departure.destination || 'Unknown'}
        </p>
        <p className="text-[11px] md:text-[12px] text-[var(--text-tertiary)] mt-0.5">
          {departure.stop_point?.designation && `Spår ${departure.stop_point.designation}`}
        </p>
      </div>
      
      {/* Time */}
      <div className="text-right shrink-0">
        {isCancelled ? (
          <span className="text-sm text-[#ff453a] font-medium">Inställd</span>
        ) : (
          <>
            <p className={`text-lg md:text-xl font-semibold tabular-nums ${
              isImminent ? 'text-[#30d158]' : 'text-[var(--text-primary)]'
            }`}>
              {formatMinutesUntil(minutesUntil)}
            </p>
            {isDelayed ? (
              <p className="text-[10px] md:text-[11px] text-[#ff9f0a] mt-0.5">
                <span className="line-through text-[var(--text-muted)] mr-1">{formatTime(departure.scheduled)}</span>
                {formatTime(departure.expected)}
              </p>
            ) : (
              <p className="text-[10px] md:text-[11px] text-[var(--text-muted)] mt-0.5">
                {formatTime(departure.expected || departure.scheduled)}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function DepartureBoard({ departures, stopDeviations, loading, error, lastUpdated }) {
  if (error) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 text-[#ff453a] text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Kunde inte ladda avgångar</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-5 py-3.5 md:py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
          <p className="font-semibold text-[15px] md:text-[16px] text-[var(--text-primary)]">Avgångar</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-3.5 h-3.5 text-[var(--text-muted)] animate-spin" />}
          {lastUpdated && !loading && (
            <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
              {lastUpdated.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
      
      {/* Platform warning */}
      {stopDeviations.length > 0 && (
        <div className="mx-4 md:mx-5 mt-4 p-3 rounded-xl bg-[#ff9f0a]/10 border border-[#ff9f0a]/20">
          {stopDeviations.slice(0, 1).map((d, i) => (
            <p key={i} className="text-[12px] md:text-[13px] text-[#ff9f0a] leading-relaxed line-clamp-2">
              {d.message}
            </p>
          ))}
        </div>
      )}
      
      {/* Departures list */}
      <div className="flex-1 px-4 md:px-5 py-2 min-h-0 overflow-y-auto scrollbar-hide">
        {departures.length === 0 ? (
          <div className="py-10 md:py-14 text-center text-[var(--text-tertiary)] text-sm">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Laddar...</span>
              </div>
            ) : (
              'Inga avgångar'
            )}
          </div>
        ) : (
          departures.slice(0, 10).map((departure, index) => (
            <DepartureRow 
              key={`${departure.journey?.id || index}-${departure.scheduled}`} 
              departure={departure}
              isFirst={index === 0}
            />
          ))
        )}
      </div>
    </div>
  );
}
