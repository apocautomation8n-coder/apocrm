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
