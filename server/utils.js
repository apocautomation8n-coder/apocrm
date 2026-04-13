import supabase from './supabaseAdmin.js'

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
    // ignore
  }

  // 2. Aggressive regex extraction
  const extract = (key) => {
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
  const msgMatch = strBody.match(/"message"\s*:\\s*"([\s\S]*)"\s*}/) || 
                   strBody.match(/"message"\s*:\\s*"([\s\S]*)"/);
  
  if (msgMatch) {
    let msg = msgMatch[1];
    if (msg.endsWith('"}')) msg = msg.slice(0, -2);
    else if (msg.endsWith('"} ')) msg = msg.slice(0, -3);
    result.message = msg;
  }

  return result;
}

/**
 * Global middleware to parse and normalize incoming API data.
 * Populates req.laxData with cleaned values.
 */
export function ultraParser(req, res, next) {
  // Capture basic info for logging
  req.startTime = Date.now();
  
  // 1. Parse body (could be object or stringified JSON from express.text)
  const parsedBody = laxParse(req.body);
  
  // 2. Merge body, query and params (Body takes priority)
  const merged = {
    ...req.params,
    ...req.query,
    ...parsedBody
  };

  // 3. Normalize known fields
  req.laxData = {
    phone: normalizePhone(merged.phone),
    name: merged.name || null,
    message: merged.message || merged.content || null,
    agent_slug: merged.agent_slug || merged.agent || null,
    timestamp: merged.timestamp || new Date().toISOString(),
    media_url: merged.media_url || merged.url || null,
    media_type: merged.media_type || 'text',
    raw: merged // Keep original for reference
  };

  // 4. Setup post-response logging
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    // Log asynchronously to not block the response
    logApiRequest(req, res, chunk).catch(err => console.error('Logging error:', err));
  };

  next();
}

/**
 * Persists API request metadata to the database for auditing and debugging.
 */
export async function logApiRequest(req, res, responseBody) {
  try {
    let errorMsg = null;
    if (res.statusCode >= 400) {
      try {
        const parsed = JSON.parse(responseBody);
        errorMsg = parsed.error || responseBody.toString();
      } catch (e) {
        errorMsg = responseBody.toString();
      }
    }

    await supabase.from('api_logs').insert({
      method: req.method,
      path: req.originalUrl || req.url,
      payload: req.body && typeof req.body === 'string' ? { raw: req.body } : req.body,
      query_params: req.query,
      status_code: res.statusCode,
      error_message: errorMsg,
      agent_slug: req.laxData?.agent_slug
    });
  } catch (err) {
    console.error('Failed to log API request:', err);
  }
}

/**
 * A wrapper for Supabase operations that adds retry logic for transient errors.
 */
export async function safeDb(operation, maxRetries = 2) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const result = await operation();
      if (result.error) {
        // Only retry on transient network/server errors (500, 502, 503, 504)
        const status = result.status || 0;
        if (status >= 500 && i < maxRetries) {
          console.warn(`Database transient error (${status}), retrying ${i+1}/${maxRetries}...`);
          await new Promise(r => setTimeout(r, 500 * (i + 1)));
          continue;
        }
        return result; // Permanent error, return it
      }
      return result; // Success
    } catch (err) {
      lastError = err;
      if (i < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
        continue;
      }
    }
  }
  return { data: null, error: lastError || new Error('Max retries exceeded') };
}

/**
 * Sends a standardized error response
 */
export function sendError(res, error, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  // Log it to console for server-side debugging
  console.error(`[API Error] ${status}: ${message}`);
  return res.status(status).json({ success: false, error: message });
}

/**
 * Sends a standardized success response
 */
export function sendSuccess(res, data = null, status = 200) {
  return res.status(status).json({ success: true, data });
}
