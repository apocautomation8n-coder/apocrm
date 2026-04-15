import supabase from './supabaseAdmin.js'

/**
 * Normalizes a phone number to a CANONICAL format.
 * For Argentina (54): strips the mobile '9' so +5491112345678 -> +541112345678
 * This ensures one single canonical form per real person.
 */
export function normalizePhone(phone) {
  if (!phone) return null;
  // Strip everything except digits
  let digits = phone.toString().replace(/\D/g, '');
  if (!digits) return null;
  
  let clean = '+' + digits;
  
  // Argentina: canonical form is WITHOUT the 9 (e.g. +541112345678)
  if (clean.startsWith('+549')) {
    clean = '+54' + clean.slice(4);
  }
  
  return clean;
}

/**
 * Returns all possible variants of a phone number for fuzzy matching.
 * For Argentina (54): returns both +54xxx and +549xxx variants.
 * For other countries: returns just the canonical form.
 */
export function getPhoneVariants(phone) {
  const canonical = normalizePhone(phone);
  if (!canonical) return [];
  
  // Argentina: generate both variants
  if (canonical.startsWith('+54')) {
    return [
      canonical,                    // +541112345678 (canonical, without 9)
      '+549' + canonical.slice(3),  // +5491112345678 (with 9)
    ];
  }
  
  return [canonical];
}

/**
 * Smart contact finder that handles phone number variants.
 * 1. Searches for ALL variants of the given phone
 * 2. If multiple contacts found (duplicates!), auto-merges them
 * 3. If none found, creates a new contact with the canonical phone
 * Returns { contact, merged } where merged is true if dedup happened.
 */
export async function findOrCreateContact(phone, name) {
  const canonical = normalizePhone(phone);
  if (!canonical) return { contact: null, error: 'Invalid phone' };
  
  const variants = getPhoneVariants(canonical);
  
  // 1. Search for ANY existing contact matching any variant
  const { data: existing, error: findErr } = await safeDb(() =>
    supabase
      .from('contacts')
      .select('*')
      .in('phone', variants)
      .order('created_at', { ascending: true })
  );
  
  if (findErr) return { contact: null, error: findErr };
  
  // Also do a case-insensitive name search if we have a name and no phone match
  // This catches cases where the same person was entered with slightly different phone formats
  // that our variants didn't catch
  
  let merged = false;
  
  if (existing && existing.length > 1) {
    // DUPLICATES FOUND! Auto-merge: keep the oldest, absorb the rest
    const main = existing[0];
    console.log(`[DEDUP] Found ${existing.length} contacts for variants ${variants.join(', ')}. Merging into ${main.id}`);
    
    for (let i = 1; i < existing.length; i++) {
      await mergeContactsServer(main.id, existing[i].id);
    }
    
    // Update the main contact with the canonical phone + new name if provided
    const updates = { phone: canonical };
    if (name && !main.name) updates.name = name;
    
    await safeDb(() =>
      supabase.from('contacts').update(updates).eq('id', main.id)
    );
    
    return { contact: main, merged: true };
  }
  
  if (existing && existing.length === 1) {
    // Found exactly one — update name if it was missing and we have one now
    const contact = existing[0];
    const updates = {};
    if (name && !contact.name) updates.name = name;
    if (contact.phone !== canonical) updates.phone = canonical; // Normalize stored phone
    
    if (Object.keys(updates).length > 0) {
      await safeDb(() =>
        supabase.from('contacts').update(updates).eq('id', contact.id)
      );
    }
    
    return { contact, merged: false };
  }
  
  // 2. No existing contact — create new one with canonical phone
  const { data: newContact, error: createErr } = await safeDb(() =>
    supabase
      .from('contacts')
      .insert({ phone: canonical, name: name || null, bot_enabled: true })
      .select('*')
      .single()
  );
  
  if (createErr) return { contact: null, error: createErr };
  return { contact: newContact, merged: false };
}

/**
 * Server-side merge: moves all related data from sourceId to targetId,
 * then deletes the source contact.
 */
export async function mergeContactsServer(targetId, sourceId) {
  console.log(`[MERGE] Merging contact ${sourceId} -> ${targetId}`);
  
  // 1. Move messages
  await safeDb(() =>
    supabase.from('messages').update({ contact_id: targetId }).eq('contact_id', sourceId)
  );
  
  // 2. Move pipeline cards
  await safeDb(() =>
    supabase.from('pipeline_cards').update({ contact_id: targetId }).eq('contact_id', sourceId)
  );
  
  // 3. Move follow-ups
  await safeDb(() =>
    supabase.from('follow_ups').update({ contact_id: targetId }).eq('contact_id', sourceId)
  );
  
  // 4. Move labels (ignore duplicates)
  const { data: sourceLabels } = await safeDb(() =>
    supabase.from('contact_labels').select('label_id').eq('contact_id', sourceId)
  );
  if (sourceLabels?.length) {
    for (const l of sourceLabels) {
      // Use upsert-like approach: try insert, ignore if exists
      await supabase.from('contact_labels')
        .insert({ contact_id: targetId, label_id: l.label_id })
        .select() // won't throw on conflict if there's a unique constraint
    }
    // Delete source labels
    await safeDb(() =>
      supabase.from('contact_labels').delete().eq('contact_id', sourceId)
    );
  }
  
  // 5. Delete source contact
  await safeDb(() =>
    supabase.from('contacts').delete().eq('id', sourceId)
  );
  
  console.log(`[MERGE] Successfully merged ${sourceId} into ${targetId}`);
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
