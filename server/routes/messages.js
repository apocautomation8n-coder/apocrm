import { Router } from 'express'
import supabase from '../supabaseAdmin.js'
import { normalizePhone, sendSuccess, sendError, laxParse } from '../utils.js'

const router = Router()

// POST /api/messages/inbound — receive inbound message from n8n / Evolution API
router.post('/inbound', async (req, res) => {
  try {
    const body = laxParse(req.body)
    const phone = body.phone || req.query.phone
    const name = body.name || req.query.name
    const message = body.message || req.query.message
    const agent_slug = body.agent_slug || req.query.agent_slug
    const timestamp = body.timestamp || req.query.timestamp

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

    // 4. Cancel any pending follow-up for this contact if they replied
    // An inbound message cancels any pending follow-up flow
    await supabase
      .from('follow_ups')
      .update({ status: 'responded', updated_at: new Date().toISOString() })
      .eq('contact_id', contact.id)
      .eq('status', 'pending')

    return sendSuccess(res)
  } catch (err) {
    return sendError(res, err)
  }
})

// GET /api/messages/inbound — Alternative for n8n cuando falla el nodo JSON
router.get('/inbound', async (req, res) => {
  try {
    const { name, phone, timestamp, message, agent_slug } = req.query
    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone || !agent_slug) return sendError(res, 'phone and agent_slug are required', 400)
    
    // Upsert contact
    const { data: contact, error: cErr } = await supabase.from('contacts').upsert({ phone: normalizedPhone, name: name || null }, { onConflict: 'phone' }).select('id').single()
    if (cErr) throw cErr

    // Find agent
    const { data: agent, error: aErr } = await supabase.from('agents').select('id').eq('slug', agent_slug).single()
    if (aErr) throw aErr
    
    // Insert message
    await supabase.from('messages').insert({
      agent_id: agent.id, contact_id: contact.id, direction: 'inbound',
      content: message || '', media_type: 'text', timestamp: timestamp || new Date().toISOString(), is_read: false,
    })
    
    return sendSuccess(res)
  } catch (err) { return sendError(res, err) }
})

// POST /api/messages/bot-outbound — receive outbound bot message from n8n to log it into CRM
router.post('/bot-outbound', async (req, res) => {
  try {
    const body = laxParse(req.body)
    const phone = body.phone || req.query.phone
    const message = body.message || req.query.message
    const agent_slug = body.agent_slug || req.query.agent_slug
    const timestamp = body.timestamp || req.query.timestamp

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

    // 4. Check if this is the "initial message" to start a follow-up flow
    // Pattern: "Hola {{name}}, ¿cómo estás? ¿Tenés un minuto?"
    const lowerContent = (message || '').toLowerCase()
    const isInitialMessage = lowerContent.includes('hola') && 
                            lowerContent.includes('¿cómo estás?') && 
                            lowerContent.includes('¿tenés un minuto?')

    if (isInitialMessage) {
      // Schedule follow-up for 23 hours from now
      const scheduledAt = new Date()
      scheduledAt.setHours(scheduledAt.getHours() + 23)

      await supabase
        .from('follow_ups')
        .insert({
          contact_id: contact.id,
          agent_id: agent.id,
          status: 'pending',
          scheduled_at: scheduledAt.toISOString()
        })
    }

    return sendSuccess(res)
  } catch (err) {
    return sendError(res, err)
  }
})

// POST /api/messages/followups/trigger - Check and trigger due follow-ups (called by n8n hourly)
router.post('/followups/trigger', async (req, res) => {
  try {
    const now = new Date().toISOString()

    // 1. Find pending follow-ups that are due
    const { data: dueFollowUps, error: fetchErr } = await supabase
      .from('follow_ups')
      .select(`
        id,
        contact_id,
        agent_id,
        contacts (name, phone),
        agents (slug)
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now)

    if (fetchErr) throw fetchErr

    if (!dueFollowUps || dueFollowUps.length === 0) {
      return sendSuccess(res, { count: 0 })
    }

    let triggeredCount = 0

    // 2. Trigger webhook for each due follow-up
    for (const fu of dueFollowUps) {
      try {
        const response = await fetch('https://automation8n.fluxia.site/webhook/f6cc20e3-267d-4e80-af86-da9bfe0d3608', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: fu.contacts?.phone,
            name: fu.contacts?.name,
            agent_slug: fu.agents?.slug,
            follow_up_id: fu.id
          })
        })

        if (response.ok) {
          // 3. Mark as followed_up
          await supabase
            .from('follow_ups')
            .update({ status: 'followed_up', updated_at: new Date().toISOString() })
            .eq('id', fu.id)
          
          triggeredCount++
        }
      } catch (err) {
        console.error(`Failed to trigger follow-up ${fu.id}:`, err)
      }
    }

    return sendSuccess(res, { count: triggeredCount })
  } catch (err) {
    return sendError(res, err)
  }
})

export default router
