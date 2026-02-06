import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock, Train } from 'lucide-react';
import { generateTransitSummary } from '../utils/gemini';

// Analyze transit data and return structured info
function analyzeTransitData({ departures, deviations, station }) {
  const total = departures.length;
  const cancelled = departures.filter(d => d.state === 'CANCELLED').length;
  const delayed = departures.filter(d => {
    if (!d.scheduled || !d.expected) return false;
    const diff = (new Date(d.expected) - new Date(d.scheduled)) / 60000;
    return diff >= 2;
  }).length;
  const onTime = total - cancelled - delayed;
  
  let status = 'good';
  if (cancelled > 0) status = 'bad';
  else if (delayed > 0 || deviations.length > 0) status = 'warning';
  
  let nextDeparture = null;
  if (departures[0]) {
    const next = departures[0];
    const time = next.expected || next.scheduled;
    if (time) {
      const mins = Math.round((new Date(time) - new Date()) / 60000);
      nextDeparture = {
        destination: next.destination || 'Unknown',
        minutes: mins,
        line: next.line?.designation || '?'
      };
    }
  }
  
  return { total, cancelled, delayed, onTime, status, nextDeparture, alertCount: deviations.length };
}

function generateLocalSummary({ departures, deviations, station }) {
  const parts = [];
  
  if (station) {
    const { total, cancelled, delayed } = analyzeTransitData({ departures, deviations, station });
    
    if (total === 0) {
      parts.push(`No departures scheduled from ${station.name} at the moment.`);
    } else if (cancelled > 0 || delayed > 0) {
      if (cancelled > 0 && delayed > 0) {
        parts.push(`There ${cancelled === 1 ? 'is' : 'are'} ${cancelled} cancelled train${cancelled > 1 ? 's' : ''} and ${delayed} delayed departure${delayed > 1 ? 's' : ''} at ${station.name}.`);
      } else if (cancelled > 0) {
        parts.push(`${cancelled} train${cancelled > 1 ? 's' : ''} ${cancelled === 1 ? 'has' : 'have'} been cancelled at ${station.name}.`);
      } else {
        parts.push(`Some trains are running a few minutes late at ${station.name}.`);
      }
    } else {
      parts.push(`All ${total} upcoming departures from ${station.name} are running on schedule.`);
    }
    
    if (departures[0]) {
      const next = departures[0];
      const time = next.expected || next.scheduled;
      if (time) {
        const mins = Math.round((new Date(time) - new Date()) / 60000);
        if (mins > 0 && mins <= 10) {
          parts.push(`Your next train to ${next.destination || 'your destination'} departs in ${mins} minute${mins > 1 ? 's' : ''}.`);
        }
      }
    }
  }
  
  if (deviations.length > 0) {
    parts.push(`There ${deviations.length === 1 ? 'is' : 'are'} ${deviations.length} service alert${deviations.length > 1 ? 's' : ''} affecting the network.`);
  } else if (!station) {
    parts.push('No service alerts at the moment. All lines running normally.');
  }
  
  return parts.join(' ');
}

export function AISummary({ departures, deviations, stopDeviations = [], station, destinationStation, isDataLoading }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAI, setIsAI] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  const generateSummary = async (forceRefresh = false) => {
    if (isDataLoading) return;
    setLoading(true);
    
    try {
      const result = await generateTransitSummary({ departures, deviations, stopDeviations, station, destinationStation, forceRefresh });
      if (result && result.trim()) {
        // If we got a result from the API, trust it as AI-generated
        // The API will throw an error if it fails, so if we get here, it's from AI
        console.log('✅ AISummary component - Setting summary:');
        console.log('Length:', result.length, 'characters');
        console.log('Full text being set:', result);
        console.log('---');
        setSummary(result);
        setIsAI(true);
        setLastGenerated(new Date());
      } else {
        console.log('⚠️ AI returned empty, using local fallback');
        const localSummary = generateLocalSummary({ departures, deviations, station });
        setSummary(localSummary);
        setIsAI(false);
        setLastGenerated(new Date());
      }
    } catch (err) {
      console.error('❌ AI summary generation failed:', err.message || err);
      const localSummary = generateLocalSummary({ departures, deviations, station });
      setSummary(localSummary);
      setIsAI(false);
      setLastGenerated(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isDataLoading && (departures.length > 0 || deviations.length > 0)) {
      const timer = setTimeout(() => generateSummary(), 500);
      return () => clearTimeout(timer);
    }
  }, [station?.id, destinationStation?.id, isDataLoading]);

  // Debug: Log when summary state changes
  useEffect(() => {
    if (summary) {
      console.log('📝 Summary state updated:');
      console.log('Length:', summary.length, 'characters');
      console.log('Full text in state:', summary);
      console.log('---');
    }
  }, [summary]);

  if (!station && deviations.length === 0 && !loading) {
    return null;
  }

  const analysis = station ? analyzeTransitData({ departures, deviations, station }) : null;
  
  const statusConfig = {
    good: { icon: CheckCircle, color: 'text-[#32d74b]', bg: 'bg-[#32d74b]', label: 'All Clear' },
    warning: { icon: AlertTriangle, color: 'text-[#ff9f0a]', bg: 'bg-[#ff9f0a]', label: 'Disruptions' },
    bad: { icon: XCircle, color: 'text-[#ff453a]', bg: 'bg-[#ff453a]', label: 'Issues' }
  };
  
  const currentStatus = analysis?.status || 'good';
  const config = statusConfig[currentStatus];
  const StatusIcon = config.icon;

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${config.bg}/15 flex items-center justify-center`}>
            <StatusIcon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[14px] text-[var(--text-primary)]">Quick Summary</p>
              {isAI && (
                <span className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)]">{station?.name || 'All lines'}</p>
          </div>
        </div>
        
        <button
          onClick={() => generateSummary(true)}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] 
                     transition-colors disabled:opacity-50"
          title="Refresh summary"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary */}
      <div className="px-5 py-3">
        {loading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-[var(--text-tertiary)] animate-spin" />
            <p className="text-[15px] text-[var(--text-tertiary)]">Generating content...</p>
          </div>
        ) : summary ? (
          <div className="w-full overflow-visible">
            <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed break-words whitespace-normal overflow-visible max-w-none" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{summary}</p>
            {lastGenerated && (
              <p className="text-[10px] text-[var(--text-muted)] mt-2">
                {lastGenerated.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[13px] text-[var(--text-muted)]">Select a station to see summary.</p>
        )}
      </div>
    </div>
  );
}
