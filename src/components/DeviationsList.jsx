import { AlertTriangle, AlertCircle, Loader2, CheckCircle, Bell } from 'lucide-react';
import { DeviationCard } from './DeviationCard';

export function DeviationsList({ 
  deviations, 
  stationDeviations, 
  loading, 
  error, 
  lastUpdated,
  selectedStation 
}) {
  const displayDeviations = selectedStation ? stationDeviations : deviations;
  
  // Count by severity
  const severeCount = displayDeviations.filter(d => (d.priority?.importance_level || 5) <= 2).length;
  const warningCount = displayDeviations.filter(d => {
    const level = d.priority?.importance_level || 5;
    return level > 2 && level <= 3;
  }).length;

  const getHeaderStyle = () => {
    if (displayDeviations.length === 0) return { bg: '', border: '', icon: CheckCircle, color: 'text-[#30d158]' };
    if (severeCount > 0) return { bg: 'bg-[#ff453a]/[0.06]', border: 'border-[#ff453a]/15', icon: AlertCircle, color: 'text-[#ff453a]' };
    if (warningCount > 0) return { bg: 'bg-[#ff9f0a]/[0.06]', border: 'border-[#ff9f0a]/15', icon: AlertTriangle, color: 'text-[#ff9f0a]' };
    return { bg: 'bg-[#0a84ff]/[0.06]', border: 'border-[#0a84ff]/15', icon: Bell, color: 'text-[#0a84ff]' };
  };

  const headerStyle = getHeaderStyle();
  const HeaderIcon = headerStyle.icon;

  if (error) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 text-[#ff453a] text-sm">
          <AlertTriangle className="w-4 h-4" />
          <div>
            <p>Kunde inte ladda störningar</p>
            {process.env.NODE_ENV === 'development' && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className={`px-4 md:px-5 py-3.5 md:py-4 border-b border-[var(--border-subtle)] ${headerStyle.bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl ${displayDeviations.length > 0 ? headerStyle.bg : 'bg-[#30d158]/10'} flex items-center justify-center`}>
              <HeaderIcon className={`w-4 h-4 md:w-[18px] md:h-[18px] ${headerStyle.color}`} />
            </div>
            <div>
              <p className="font-semibold text-[14px] md:text-[15px] text-[var(--text-primary)]">
                {displayDeviations.length === 0 ? 'Inga störningar' : `${displayDeviations.length} störning${displayDeviations.length !== 1 ? 'ar' : ''}`}
              </p>
              {selectedStation && (
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 hidden sm:block">
                  {selectedStation.name}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {loading && <Loader2 className="w-3.5 h-3.5 text-[var(--text-muted)] animate-spin" />}
            {severeCount > 0 && (
              <span className="px-2 py-1 rounded-lg bg-[#ff453a]/15 text-[#ff453a] text-[10px] md:text-[11px] font-semibold">
                {severeCount} kritisk
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {displayDeviations.length === 0 ? (
          <div className="py-8 md:py-10 text-center">
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-[var(--text-tertiary)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Laddar...</p>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#30d158]/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-[#30d158]" />
                </div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">Trafiken går som den ska</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {displayDeviations.map(deviation => (
              <DeviationCard key={deviation.deviation_case_id} deviation={deviation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
