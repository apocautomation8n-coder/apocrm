import { Router } from 'express'
import supabase from '../supabaseAdmin.js'
import { normalizePhone, sendSuccess, sendError } from '../utils.js'

const router = Router()

// POST /api/messages/inbound — receive inbound message from n8n / Evolution API
router.post('/inbound', async (req, res) => {
  try {
    const { name, phone, timestamp, message, agent_slug } = req.body
    const normalizedPhone = normalizePhone(phone)

    if (!normalizedPhone || !agent_slug) {
      return sendError(res, 'phone and agent_slug are required', 400)
    }

    // 1. Find or create contact using upsert
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .upsert(
        { phone: normalizedPhone, name: name || null },
        { onConflict: 'phone' }
      )
      .select('id')
      .single()

    if (contactErr || !contact) {
      return sendError(res, 'Failed to handle contact', 500)
    }

    // 2. Find agent by slug
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .select('id')
      .eq('slug', agent_slug)
      .single()

    if (agentErr || !agent) {
      return sendError(res, `Agent '${agent_slug}' not found`, 404)
    }

    // 3. Insert message
    const { error: msgErr } = await supabase
      .from('messages')
      .insert({
        agent_id: agent.id,
        contact_id: contact.id,
        direction: 'inbound',
        content: message || '',
        media_type: 'text',
        timestamp: timestamp || new Date().toISOString(),
        is_read: false,
      })

    if (msgErr) {
      return sendError(res, 'Failed to save message', 500)
    }

    return sendSuccess(res)
  } catch (err) {
    return sendError(res, err)
  }
})

// POST /api/messages/bot-outbound — receive outbound bot message from n8n to log it into CRM
router.post('/bot-outbound', async (req, res) => {
  try {
    const { phone, message, agent_slug, timestamp } = req.body
    const normalizedPhone = normalizePhone(phone)

    if (!normalizedPhone || !agent_slug) {
      return sendError(res, 'phone and agent_slug are required', 400)
    }

    // 1. Find or create contact using upsert
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .upsert(
        { phone: normalizedPhone },
        { onConflict: 'phone' }
      )
      .select('id')
      .single()

    if (contactErr || !contact) {
      return sendError(res, 'Failed to handle contact for bot message', 500)
    }

    // 2. Find agent by slug
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .select('id')
      .eq('slug', agent_slug)
      .single()

    if (agentErr || !agent) {
      return sendError(res, `Agent '${agent_slug}' not found`, 404)
    }

    // 3. Insert outbound message
    const { error: msgErr } = await supabase
      .from('messages')
      .insert({
        agent_id: agent.id,
        contact_id: contact.id,
        direction: 'outbound',
        content: message || '',
        media_type: 'text',
        is_read: true,
        timestamp: timestamp || new Date().toISOString(),
      })

    if (msgErr) {
      return sendError(res, 'Failed to save bot message', 500)
    }

    return sendSuccess(res)
  } catch (err) {
    return sendError(res, err)
  }
})

export default router
