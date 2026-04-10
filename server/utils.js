/**
 * Utility functions for server logic and response handling
 */

/**
 * Normalizes a phone number to standard international format (e.g., +5491112345678)
 * Strips all non-numeric characters except for the leading '+'
 * If no '+' is present, it adds it if feasible or just returns cleaned numeric string
 */
export function normalizePhone(phone) {
  if (!phone) return null;
  // Strip all non-numeric chars except '+'
  let cleaned = phone.toString().replace(/[^\d+]/g, '');
  
  // Ensure it starts with '+'
  if (cleaned && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * A robust/lax JSON parser that extracts key fields even if the JSON is malformed.
 * Useful for n8n/Evolution API requests where unescaped quotes or newlines occur.
 */
export function laxParse(rawBody) {
  if (!rawBody) return {};
  if (typeof rawBody === 'object') return rawBody;

  try {
    return JSON.parse(rawBody);
  } catch (err) {
    console.warn('LaxParse: Standard JSON.parse failed, attempting regex recovery...', err.message);
    
    const result = {};
    
    // Regex patterns for key fields
    const phoneMatch = rawBody.match(/"phone"\s*:\s*"(\+?[\d\s-]+)"/);
    const slugMatch = rawBody.match(/"agent_slug"\s*:\s*"([^"]+)"/);
    const nameMatch = rawBody.match(/"name"\s*:\s*"([^"]+)"/);
    
    // Message is trickier because it contains the garbage
    // We try to find "message": " and everything until the end, ignoring the last " and }
    const messageMatch = rawBody.match(/"message"\s*:\s*"([\s\S]*)"\s*}/) || 
                         rawBody.match(/"message"\s*:\s*"([\s\S]*)"/);

    if (phoneMatch) result.phone = phoneMatch[1].trim();
    if (slugMatch) result.agent_slug = slugMatch[1].trim();
    if (nameMatch) result.name = nameMatch[1].trim();
    if (messageMatch) {
      // Clean up trailing garbage if regex was too greedy
      let msg = messageMatch[1];
      result.message = msg;
    }

    return result;
  }
}

/**
 * Sends a standardized error response
 */
export function sendError(res, error, status = 500) {
  const message = error instanceof Error ? error.message : error;
  console.error(`API Error: ${message}`, error);
  return res.status(status).json({ success: false, error: message });
}

/**
 * Sends a standardized success response
 */
export function sendSuccess(res, data = null, status = 200) {
  return res.status(status).json({ success: true, data });
}
