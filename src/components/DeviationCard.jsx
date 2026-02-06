import { AlertCircle, AlertTriangle, Info, ChevronDown, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { getLineColorClass } from '../utils/api';

export function DeviationCard({ deviation }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const message = deviation.message_variants?.find(v => v.language === 'sv') 
    || deviation.message_variants?.[0] || {};
  
  const importance = deviation.priority?.importance_level || 5;
  
  const getSeverity = () => {
    if (importance <= 2) return { 
      icon: AlertCircle, 
      color: 'text-[#ff453a]', 
      bg: 'bg-[#ff453a]/[0.06]',
      iconBg: 'bg-[#ff453a]/15',
    };
    if (importance <= 3) return { 
      icon: AlertTriangle, 
      color: 'text-[#ff9f0a]', 
      bg: 'bg-[#ff9f0a]/[0.06]',
      iconBg: 'bg-[#ff9f0a]/15',
    };
    return { 
      icon: Info, 
      color: 'text-[#0a84ff]', 
      bg: 'bg-[#0a84ff]/[0.06]',
      iconBg: 'bg-[#0a84ff]/15',
    };
  };

  const severity = getSeverity();
  const Icon = severity.icon;
  const lines = deviation.scope?.lines || [];
  const hasDetails = message.details || message.weblink;

  return (
    <div className={`${severity.bg}`}>
      <button
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        disabled={!hasDetails}
        className={`w-full px-4 md:px-5 py-3.5 md:py-4 flex items-start gap-3 text-left ${
          hasDetails ? 'cursor-pointer active:bg-[var(--bg-elevated)]' : 'cursor-default'
        }`}
      >
        {/* Icon */}
        <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl ${severity.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 md:w-[18px] md:h-[18px] ${severity.color}`} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-medium text-[13px] md:text-[14px] text-[var(--text-primary)] leading-snug pr-2">
            {message.header || 'Trafikstörning'}
          </p>
          
          {/* Lines */}
          {lines.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {lines.slice(0, 5).map(line => (
                <span 
                  key={line.id}
                  className={`${getLineColorClass(line.transport_mode, line.group_of_lines)} 
                              px-1.5 md:px-2 py-0.5 rounded-md text-[10px] md:text-[11px] font-bold text-white`}
                >
                  {line.designation}
                </span>
              ))}
              {lines.length > 5 && (
                <span className="px-1.5 py-0.5 rounded-md bg-[var(--bg-elevated)] text-[10px] font-medium text-[var(--text-tertiary)]">
                  +{lines.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Chevron */}
        {hasDetails && (
          <ChevronDown className={`w-4 h-4 md:w-5 md:h-5 text-[var(--text-muted)] shrink-0 mt-0.5 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`} />
        )}
      </button>
      
      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="px-4 md:px-5 pb-4 -mt-1 animate-in">
          <div className="ml-11 md:ml-12">
            {message.details && (
              <p className="text-[12px] md:text-[13px] text-[var(--text-tertiary)] leading-relaxed">
                {message.details}
              </p>
            )}
            {message.weblink && (
              <a 
                href={message.weblink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg 
                           bg-[var(--bg-elevated)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-default)]
                           text-[11px] md:text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ExternalLink className="w-3 h-3 md:w-3.5 md:h-3.5" />
                Läs mer
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
