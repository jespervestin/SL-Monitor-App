import { useState } from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, ChevronDown, Loader2 } from 'lucide-react';

export function StatusIndicator({ departures, deviations, loading }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getStatus = () => {
    if (loading) {
      return { 
        type: 'loading',
        icon: Loader2, 
        label: 'Loading...', 
        description: 'Fetching latest data',
        color: 'text-[var(--text-tertiary)]',
        bg: 'bg-[var(--bg-elevated)]',
        border: 'border-[var(--border-subtle)]',
        spin: true 
      };
    }

    const hasDeviations = deviations.length > 0;
    const delayedDepartures = departures.filter(dep => {
      if (!dep.scheduled || !dep.expected) return false;
      const delayMinutes = (new Date(dep.expected) - new Date(dep.scheduled)) / 60000;
      return delayMinutes >= 3;
    });
    const hasDelays = delayedDepartures.length > 0;

    if (hasDeviations) {
      const severeCount = deviations.filter(d => d.priority?.importance_level <= 2).length;
      if (severeCount > 0) {
        return { 
          type: 'severe',
          icon: AlertCircle, 
          label: 'Disruptions', 
          description: `${deviations.length} active alert${deviations.length > 1 ? 's' : ''}`,
          color: 'text-[#ff453a]',
          bg: 'bg-[#ff453a]/[0.08]',
          border: 'border-[#ff453a]/20',
          details: deviations
        };
      }
      return { 
        type: 'minor',
        icon: AlertTriangle, 
        label: 'Service alerts', 
        description: `${deviations.length} alert${deviations.length > 1 ? 's' : ''} affecting service`,
        color: 'text-[#ff9f0a]',
        bg: 'bg-[#ff9f0a]/[0.08]',
        border: 'border-[#ff9f0a]/20',
        details: deviations
      };
    }

    if (hasDelays) {
      return { 
        type: 'delays',
        icon: AlertTriangle, 
        label: 'Minor delays', 
        description: `${delayedDepartures.length} train${delayedDepartures.length > 1 ? 's' : ''} delayed`,
        color: 'text-[#ff9f0a]',
        bg: 'bg-[#ff9f0a]/[0.08]',
        border: 'border-[#ff9f0a]/20',
      };
    }

    return { 
      type: 'ok',
      icon: CheckCircle, 
      label: 'On time', 
      description: `${departures.length} departures running normally`,
      color: 'text-[#32d74b]',
      bg: 'bg-[#32d74b]/[0.08]',
      border: 'border-[#32d74b]/20',
    };
  };

  const status = getStatus();
  const Icon = status.icon;
  const hasDetails = status.details && status.details.length > 0;

  return (
    <div className={`${status.bg} border ${status.border} rounded-2xl overflow-hidden`}>
      <button 
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        disabled={!hasDetails}
        className={`w-full px-5 py-4 flex items-center gap-4 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${status.color} ${status.spin ? 'animate-spin' : ''}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-[15px] ${status.color}`}>{status.label}</p>
          <p className="text-[13px] text-[var(--text-tertiary)]">{status.description}</p>
        </div>
        
        {hasDetails && (
          <div className={`w-7 h-7 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
          </div>
        )}
      </button>
      
      {isExpanded && hasDetails && (
        <div className="px-5 pb-4 border-t border-[var(--border-subtle)]">
          <div className="pt-3 space-y-2">
            {status.details.slice(0, 5).map((deviation, index) => {
              const message = deviation.message_variants?.find(v => v.language === 'sv') 
                || deviation.message_variants?.[0] || {};
              const lines = deviation.scope?.lines || [];
              
              return (
                <div key={deviation.deviation_case_id || index} className="flex items-start gap-3 py-2">
                  <div className="w-1 h-1 rounded-full bg-[var(--text-muted)] mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[var(--text-secondary)] leading-snug">
                      {message.header || 'Service disruption'}
                    </p>
                    {lines.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {lines.slice(0, 4).map(line => (
                          <span key={line.id} className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[10px] font-medium text-[var(--text-secondary)]">
                            {line.designation}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {status.details.length > 5 && (
              <p className="text-[12px] text-[var(--text-tertiary)] pt-1">
                +{status.details.length - 5} more alerts
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
