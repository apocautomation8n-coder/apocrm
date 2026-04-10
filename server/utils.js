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

  const result = {};

  // 1. Try standard JSON parse
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (err) {
    console.warn('LaxParse: JSON.parse failed, falling back to regex extraction');
  }

  // 2. Aggressive regex extraction
  // Handles cases like {"phone": "123", "message": "Dijo "Hola""}
  
  // Extract phone (look for "phone": "VALUE")
  const phoneMatch = rawBody.match(/"phone"\s*:\s*"([^"]+)"/);
  if (phoneMatch) result.phone = phoneMatch[1].trim();

  // Extract agent_slug
  const slugMatch = rawBody.match(/"agent_slug"\s*:\s*"([^"]+)"/);
  if (slugMatch) result.agent_slug = slugMatch[1].trim();

  // Extract name (optional)
  const nameMatch = rawBody.match(/"name"\s*:\s*"([^"]+)"/);
  if (nameMatch) result.name = nameMatch[1].trim();

  // Extract message (the most problematic field)
  // We look for everything after "message": " until the end of the string or the closing bracket
  const msgMatch = rawBody.match(/"message"\s*:\s*"([\s\S]*)"\s*}/) || 
                   rawBody.match(/"message"\s*:\s*"([\s\S]*)"/);
  
  if (msgMatch) {
    let msg = msgMatch[1];
    // If it's a broken JSON, we might have captured the closing part too. Clean it.
    if (msg.endsWith('"}')) msg = msg.slice(0, -2);
    else if (msg.endsWith('"} ')) msg = msg.slice(0, -3);
    result.message = msg;
  }

  return result;
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
