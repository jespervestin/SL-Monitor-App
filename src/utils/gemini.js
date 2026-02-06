const GEMINI_API_KEY = 'AIzaSyBnXM-qoIEkMTfiiQ980vPM3UVqmMuWFic';
const GEMINI_MODEL = 'gemini-3-flash-preview';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Simple cache to avoid hitting rate limits
const cache = {
  summary: null,
  stationId: null,
  timestamp: null,
  TTL: 30000, // 30 second cache (only for auto-refreshes, manual refresh bypasses)
};

/**
 * Generate an AI summary of the current transit situation
 * @param {Object} data - Transit data to analyze
 * @param {Array} data.departures - Array of departure objects
 * @param {Array} data.deviations - Array of deviation/alert objects
 * @param {Array} data.stopDeviations - Array of stop-specific deviation objects (optional)
 * @param {Object} data.station - Selected station object (optional)
 * @param {Object} data.destinationStation - Destination station object (optional)
 * @param {boolean} data.forceRefresh - If true, bypasses cache and makes a new API call
 * @returns {Promise<string>} AI-generated summary
 */
export async function generateTransitSummary({ departures, deviations, stopDeviations = [], station, destinationStation, forceRefresh = false }) {
  const stationId = station?.id || 'global';
  const destinationId = destinationStation?.id || null;
  const cacheKey = `${stationId}-${destinationId || 'none'}`;
  const now = Date.now();
  
  // Check cache first (unless forceRefresh is true)
  if (!forceRefresh && 
      cache.summary && 
      cache.stationId === cacheKey && 
      cache.timestamp && 
      (now - cache.timestamp) < cache.TTL) {
    console.log('📦 Using cached summary (age:', Math.round((now - cache.timestamp) / 1000), 's)');
    return cache.summary;
  }

  const prompt = buildPrompt({ departures, deviations, stopDeviations, station, destinationStation });
  console.log('🤖 Calling Gemini API...', forceRefresh ? '(force refresh)' : '');
  
  try {
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000  // Increased to account for thinking tokens + full response
      }
    };
    
    console.log('📤 Request body length:', JSON.stringify(requestBody).length, 'chars');
    console.log('📤 Prompt length:', prompt.length, 'chars');
    
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || errorData?.message || 'Unknown error';
      console.error('❌ Gemini API error:', response.status, errorMessage, errorData);
      
      if (response.status === 429) {
        throw new Error('Rate limited - please wait a moment and try again');
      }
      if (response.status === 400) {
        throw new Error(`Invalid request: ${errorMessage}`);
      }
      throw new Error(`Gemini API error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    
    // Log full response structure for debugging
    console.log('🔍 Full API response structure:', JSON.stringify(data, null, 2));
    
    // Check if there are multiple candidates or parts
    const candidate = data.candidates?.[0];
    if (!candidate) {
      console.error('❌ No candidates in response:', data);
      throw new Error('No response candidates from Gemini API');
    }
    
    // Check finish reason to see if response was cut off
    const finishReason = candidate.finishReason;
    console.log('🏁 Finish reason:', finishReason);
    if (finishReason === 'MAX_TOKENS') {
      console.warn('⚠️ Response was cut off due to MAX_TOKENS limit!');
    } else if (finishReason === 'STOP') {
      console.log('✅ Response completed normally');
    } else {
      console.log('ℹ️ Finish reason:', finishReason);
    }
    
    // Extract text from all parts (in case there are multiple)
    const parts = candidate.content?.parts || [];
    console.log('📦 Number of parts:', parts.length);
    
    let summary = '';
    parts.forEach((part, idx) => {
      if (part.text) {
        console.log(`Part ${idx + 1} length:`, part.text.length, 'characters');
        summary += part.text;
      }
    });
    
    if (!summary) {
      console.error('❌ No text found in parts:', parts);
      summary = 'Unable to generate summary.';
    }
    
    console.log('✨ Gemini API FULL response:');
    console.log('Total length:', summary.length, 'characters');
    console.log('Full text:', summary);
    console.log('---');
    
    // Cache the successful response
    cache.summary = summary;
    cache.stationId = cacheKey;
    cache.timestamp = now;
    
    return summary;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

/**
 * Build the prompt for the AI summary
 */
function buildPrompt({ departures, deviations, stopDeviations = [], station, destinationStation }) {
  const now = new Date();
  const nowTime = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const nowDate = now.toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  // Analyze departures
  const departureInfo = analyzeDepartures(departures);
  
  // Analyze deviations
  const deviationInfo = analyzeDeviations(deviations);
  
  // Analyze stop-specific deviations (platform alerts)
  let stopDeviationInfo = '';
  if (stopDeviations && stopDeviations.length > 0) {
    stopDeviationInfo = `\nPLATFORM-SPECIFIC ALERTS AT THIS STATION:\n`;
    stopDeviations.forEach((sd, idx) => {
      const message = sd.message?.trim() || 'Platform alert';
      const platform = sd.stop_point?.designation ? `Platform ${sd.stop_point.designation}` : 'This platform';
      stopDeviationInfo += `${idx + 1}. ${platform}: ${message}\n`;
    });
  }
  
  // Build station context with trip information if available
  let stationContext = '';
  if (station && destinationStation) {
    const destinationName = destinationStation.name || destinationStation.disassembledName || 'destination';
    stationContext = `The user is planning a trip from ${station.name} to ${destinationName}. They are viewing departures from ${station.name} station.`;
  } else if (station) {
    stationContext = `The user is viewing departures from ${station.name} station.`;
  } else {
    stationContext = 'The user is viewing general transit information for Stockholm.';
  }

  return `You are a helpful Stockholm transit assistant. Write a practical, high-level summary about the current transit situation. Focus on overall impact and what it means for commuters, not specific departure times.

CRITICAL: Write your response in SWEDISH. All text must be in Swedish.

IMPORTANT: Be BRIEF when everything is fine. Only expand when there are actual issues. No filler text.

WHAT TO FOCUS ON:
- Overall status: Is everything running smoothly, or are there widespread delays?
- Impact assessment: If there are delays, how significant are they? Will commuters be noticeably late?
- Practical implications: "You might expect to be 15-20 minutes later than usual" or "Everything is running on time, you should be fine"
- Scale of issues: "A few trains are running late" vs "There are widespread delays affecting most routes"
- Service alert impact: How do the alerts affect commuters in practical terms?
- General reassurance or warnings: "You can expect a normal commute" vs "Plan for extra travel time"
- Trip-specific context: If the user has selected a destination, consider how delays/issues at the origin station might affect their specific trip

WHAT NOT TO INCLUDE:
- Specific departure times (e.g., "Line 41 at 16:15")
- Individual train details (e.g., "The 16:22 train to Märsta")
- Platform numbers unless critical
- Listing every delayed train - just give the overall picture

WRITING STYLE:
- Be BRIEF when everything is fine - just say it's fine, no filler
- Only expand when there are actual issues that matter
- Don't say hi or hello - just jump into the helpful information
- Don't start with "Here's the situation" or "Summary:" - just begin with the information
- Get straight to the point - no unnecessary words
- Think like a commuter: "Should I leave early?" "Will I be late?" "Is everything normal?"

EXAMPLES OF GOOD SUMMARIES (all in Swedish):
- When everything is fine: "Alla tåg går i tid. Inga problem." or "Allt normalt, inga förseningar."
- Minor issues: "Några tåg går 5-10 minuter sent. Räkna med cirka 10 minuters extra restid."
- Major issues: "Betydande förseningar på flera linjer - räkna med 20-30 minuter senare än vanligt."
- With alerts: "Det finns serviceaviseringar men de flesta tåg går ändå. Mindre förseningar möjliga."

CURRENT CONTEXT:
Date and time: ${nowDate}, ${nowTime}
${stationContext}

${departureInfo}

${deviationInfo}${stopDeviationInfo}

Write a practical, high-level summary in SWEDISH focusing on overall impact and what commuters can expect. Start directly with the information - make it feel like a helpful friend telling you what to expect for your commute. Use natural Swedish, not English.`;
}

/**
 * Analyze departures and create a detailed summary string
 */
function analyzeDepartures(departures) {
  if (!departures || departures.length === 0) {
    return 'No departure data available.';
  }

  const now = new Date();
  const total = departures.length;
  const cancelled = departures.filter(d => d.state === 'CANCELLED');
  const delayed = departures.filter(d => {
    if (!d.scheduled || !d.expected || d.state === 'CANCELLED') return false;
    const diff = (new Date(d.expected) - new Date(d.scheduled)) / 60000;
    return diff >= 2;
  });
  const onTime = departures.filter(d => {
    if (d.state === 'CANCELLED') return false;
    if (!d.scheduled || !d.expected) return true;
    const diff = (new Date(d.expected) - new Date(d.scheduled)) / 60000;
    return diff < 2;
  });

  const lines = [...new Set(departures.map(d => d.line?.designation).filter(Boolean))];
  const transportModes = [...new Set(departures.map(d => d.line?.transport_mode).filter(Boolean))];

  let info = `DEPARTURE OVERVIEW:\n`;
  info += `Total upcoming departures: ${total}\n`;
  info += `Transport modes: ${transportModes.join(', ') || 'Unknown'}\n`;
  info += `Lines serving this station: ${lines.join(', ') || 'Unknown'}\n`;
  info += `On-time departures: ${onTime.length}\n`;
  info += `Delayed departures: ${delayed.length}\n`;
  info += `Cancelled departures: ${cancelled.length}\n\n`;

  // Detailed departure list (next 8-10 departures)
  info += `UPCOMING DEPARTURES (next ${Math.min(10, departures.length)}):\n`;
  departures.slice(0, 10).forEach((d, idx) => {
    const scheduled = d.scheduled ? new Date(d.scheduled) : null;
    const expected = d.expected ? new Date(d.expected) : scheduled;
    const scheduledTime = scheduled ? scheduled.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
    const expectedTime = expected ? expected.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : scheduledTime;
    const minutesUntil = expected ? Math.round((expected - now) / 60000) : null;
    
    let status = '';
    if (d.state === 'CANCELLED') {
      status = ' [CANCELLED]';
    } else if (scheduled && expected) {
      const delayMins = Math.round((expected - scheduled) / 60000);
      if (delayMins >= 2) {
        status = ` [DELAYED: ${delayMins} min late, was ${scheduledTime}, now ${expectedTime}]`;
      } else {
        status = ` [ON TIME: ${expectedTime}]`;
      }
    }
    
    const platform = d.stop_point?.designation ? ` Platform ${d.stop_point.designation}` : '';
    const lineInfo = d.line?.designation ? `Line ${d.line.designation}` : 'Unknown line';
    const destination = d.destination || 'Unknown destination';
    const timeInfo = minutesUntil !== null ? `in ${minutesUntil} min` : expectedTime;
    
    info += `${idx + 1}. ${lineInfo} to ${destination}${platform} - ${timeInfo}${status}\n`;
  });

  // Summary of issues
  if (cancelled.length > 0) {
    info += `\nCANCELLED TRAINS:\n`;
    cancelled.forEach(d => {
      const line = d.line?.designation || '?';
      const dest = d.destination || 'Unknown';
      const time = d.scheduled ? new Date(d.scheduled).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
      info += `- Line ${line} to ${dest} (was scheduled ${time})\n`;
    });
  }

  if (delayed.length > 0) {
    info += `\nDELAYED TRAINS:\n`;
    delayed.forEach(d => {
      const scheduled = d.scheduled ? new Date(d.scheduled) : null;
      const expected = d.expected ? new Date(d.expected) : scheduled;
      const delayMins = scheduled && expected ? Math.round((expected - scheduled) / 60000) : 0;
      const line = d.line?.designation || '?';
      const dest = d.destination || 'Unknown';
      const scheduledTime = scheduled ? scheduled.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
      const expectedTime = expected ? expected.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : scheduledTime;
      info += `- Line ${line} to ${dest}: ${delayMins} min delay (${scheduledTime} → ${expectedTime})\n`;
    });
  }

  return info;
}

/**
 * Analyze deviations and create a detailed summary string
 */
function analyzeDeviations(deviations) {
  if (!deviations || deviations.length === 0) {
    return 'No active service alerts. All services running normally.';
  }

  let info = `SERVICE ALERTS (${deviations.length} active):\n\n`;

  deviations.forEach((d, idx) => {
    const severity = d.severity || 'INFO';
    const title = d.title || d.header || 'Service Alert';
    const message = d.message?.trim() || d.description || 'Service disruption';
    const affectedLines = d.scope?.lines?.map(l => l.designation).filter(Boolean) || [];
    const affectedSites = d.scope?.sites?.map(s => s.name).filter(Boolean) || [];
    const transportModes = d.scope?.transport_modes || [];
    
    // Get validity period if available
    const validFrom = d.valid_from ? new Date(d.valid_from).toLocaleString('sv-SE') : null;
    const validTo = d.valid_to ? new Date(d.valid_to).toLocaleString('sv-SE') : null;
    
    info += `ALERT ${idx + 1}:\n`;
    info += `Severity: ${severity}\n`;
    info += `Title: ${title}\n`;
    info += `Message: ${message}\n`;
    
    if (affectedLines.length > 0) {
      info += `Affected lines: ${affectedLines.join(', ')}\n`;
    }
    if (affectedSites.length > 0) {
      info += `Affected stations: ${affectedSites.join(', ')}\n`;
    }
    if (transportModes.length > 0) {
      info += `Transport modes: ${transportModes.join(', ')}\n`;
    }
    if (validFrom || validTo) {
      if (validFrom) info += `Valid from: ${validFrom}\n`;
      if (validTo) info += `Valid until: ${validTo}\n`;
    }
    
    info += `\n`;
  });

  return info;
}
