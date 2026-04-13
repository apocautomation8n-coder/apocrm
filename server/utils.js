/**
 * Utility functions for server logic and response handling
 */

/**
 * Normalizes a phone number to standard international format (e.g., +5491112345678)
 * Strips all non-numeric characters and ensures a leading '+'
 */
export function normalizePhone(phone) {
  if (!phone) return null;
  // Strip everything except digits
  let digits = phone.toString().replace(/\D/g, '');
  if (!digits) return null;
  
  // Return with leading '+'
  return '+' + digits;
}

/**
 * A robust/lax JSON parser that extracts key fields even if the JSON is malformed.
 * Useful for n8n/Evolution API requests where unescaped quotes or newlines occur.
 */
export function laxParse(rawBody) {
  if (!rawBody) return {};
  
  // If it's already an object, return it but ensure it's not null
  if (typeof rawBody === 'object' && rawBody !== null) return rawBody;

  const result = {};
  const strBody = String(rawBody);

  // 1. Try standard JSON parse
  try {
    const parsed = JSON.parse(strBody);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (err) {
    // console.warn('LaxParse: JSON.parse failed, falling back to regex extraction');
  }

  // 2. Aggressive regex extraction
  // Handles cases like {"phone": "123", "message": "Dijo "Hola""}
  
  const extract = (key) => {
    // Look for "key": "value" or 'key': 'value' or key: "value"
    const patterns = [
      new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`, 'i'),
      new RegExp(`'${key}'\\s*:\\s*'([^']*)'`, 'i'),
      new RegExp(`"${key}"\\s*:\\s*'([^']*)'`, 'i'),
      new RegExp(`'${key}'\\s*:\\s*"([^"]*)"`, 'i'),
      new RegExp(`${key}\\s*:\\s*"([^"]*)"`, 'i'),
      new RegExp(`${key}\\s*:\\s*'([^']*)'`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = strBody.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  };

  result.phone = extract('phone');
  result.name = extract('name');
  result.agent_slug = extract('agent_slug') || extract('agent');
  
  // Extract message (handling potential broken JSON at the end)
  const msgMatch = strBody.match(/"message"\s*:\s*"([\s\S]*)"\s*}/) || 
                   strBody.match(/"message"\s*:\s*"([\s\S]*)"/);
  
  if (msgMatch) {
    let msg = msgMatch[1];
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
