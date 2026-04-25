import { Router } from 'express'
import supabase from '../supabaseAdmin.js'
import { sendSuccess, sendError, safeDb, findOrCreateContact } from '../utils.js'

const AGENT_VIDEO_LINKS = {
  talleres: 'youtube.com/watch?v=i93Yyv8REjg',
  gym: 'youtube.com/shorts/L0VKAk4YTb0',
}

const router = Router()

// POST /api/messages/inbound — receive inbound message from n8n / Evolution API
router.post('/inbound', async (req, res) => {
  try {
    const { phone, name, message, agent_slug, timestamp } = req.laxData

    if (!phone || !agent_slug) {
      return sendError(res, 'phone and agent_slug are required', 400)
    }

    // 1. Smart find-or-create: searches ALL phone variants, auto-merges duplicates
    const { contact, error: contactErr, merged } = await findOrCreateContact(phone, name)

    if (contactErr || !contact) {
      return sendError(res, 'Failed to handle contact', 500)
    }

    if (merged) {
      console.log(`[INBOUND] Auto-merged duplicate contacts for phone: ${phone}`)
    }

    // 2. Find agent by slug
    const { data: agent, error: agentErr } = await safeDb(() => 
      supabase
        .from('agents')
        .select('id')
        .eq('slug', agent_slug)
        .single()
    )

    if (agentErr || !agent) {
      return sendError(res, `Agent '${agent_slug}' not found`, 404)
    }

    // 3. Insert message
    const { error: msgErr } = await safeDb(() => 
      supabase
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
    )

    if (msgErr) {
      return sendError(res, 'Failed to save message', 500)
    }

    // 4. Cancel any pending follow-up for this contact if they replied
    await safeDb(() => 
      supabase
        .from('follow_ups')
        .update({ status: 'responded', updated_at: new Date().toISOString() })
        .eq('contact_id', contact.id)
        .eq('status', 'pending')
    )

    return sendSuccess(res)
  } catch (err) {
    return sendError(res, err)
  }
})

// GET /api/messages/inbound — Alternative for n8n cuando falla el nodo JSON
// Note: ultraParser already unifies query params into laxData
router.get('/inbound', async (req, res) => {
  try {
    const { phone, name, message, agent_slug, timestamp } = req.laxData

    if (!phone || !agent_slug) {
      return sendError(res, 'phone and agent_slug are required', 400)
    }
    
    // 1. Smart find-or-create with phone variant matching
    const { contact, error: cErr } = await findOrCreateContact(phone, name)
    if (cErr || !contact) throw cErr || new Error('Failed to handle contact')

    // 2. Find agent
    const { data: agent, error: aErr } = await safeDb(() => 
      supabase.from('agents').select('id').eq('slug', agent_slug).single()
    )
    if (aErr) throw aErr
    
    // 3. Insert message
    await safeDb(() => 
      supabase.from('messages').insert({
        agent_id: agent.id, contact_id: contact.id, direction: 'inbound',
        content: message || '', media_type: 'text', timestamp: timestamp || new Date().toISOString(), is_read: false,
      })
    )
    
    return sendSuccess(res)
  } catch (err) { return sendError(res, err) }
})

// POST /api/messages/bot-outbound — receive outbound bot message from n8n to log it into CRM
router.post('/bot-outbound', async (req, res) => {
  try {
    const { phone, message, agent_slug, timestamp } = req.laxData

    if (!phone || !agent_slug) {
      return sendError(res, 'phone and agent_slug are required', 400)
    }

    // 1. Smart find-or-create with phone variant matching
    const { contact, error: contactErr, merged } = await findOrCreateContact(phone, null)

    if (contactErr || !contact) {
      return sendError(res, 'Failed to handle contact for bot message', 500)
    }

    if (merged) {
      console.log(`[BOT-OUTBOUND] Auto-merged duplicate contacts for phone: ${phone}`)
    }

    // 2. Find agent by slug
    const { data: agent, error: agentErr } = await safeDb(() => 
      supabase
        .from('agents')
        .select('id')
        .eq('slug', agent_slug)
        .single()
    )

    if (agentErr || !agent) {
      return sendError(res, `Agent '${agent_slug}' not found`, 404)
    }

    // 3. Insert outbound message
    const { error: msgErr } = await safeDb(() => 
      supabase
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
    )

    if (msgErr) {
      return sendError(res, 'Failed to save bot message', 500)
    }

    // 4. Check if this is the "initial message" to start a follow-up flow
    const lowerContent = (message || '').toLowerCase()
    const isInitialMessage = lowerContent.includes('hola') && 
                            lowerContent.includes('¿cómo estás?') && 
                            lowerContent.includes('¿tenés un minuto?')

    if (isInitialMessage) {
      const scheduledAt = new Date()
      scheduledAt.setHours(scheduledAt.getHours() + 23)

      await safeDb(() => 
        supabase
          .from('follow_ups')
          .insert({
            contact_id: contact.id,
            agent_id: agent.id,
            status: 'pending',
            type: 'default',
            scheduled_at: scheduledAt.toISOString()
          })
      )
    }

    // 5. Detect Video Link and Schedule "Seguimiento 2" (2 days later)
    const videoUrl = AGENT_VIDEO_LINKS[agent_slug]
    if (videoUrl && lowerContent.includes(videoUrl.toLowerCase())) {
      const scheduledAt = new Date()
      scheduledAt.setDate(scheduledAt.getDate() + 2) // 2 days later

      await safeDb(() => 
        supabase
          .from('follow_ups')
          .insert({
            contact_id: contact.id,
            agent_id: agent.id,
            status: 'pending',
            type: 'video',
            scheduled_at: scheduledAt.toISOString()
          })
      )
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
    const { data: dueFollowUps, error: fetchErr } = await safeDb(() => 
      supabase
        .from('follow_ups')
        .select(`
          id,
          contact_id,
          agent_id,
          type,
          contacts (name, phone),
          agents (slug)
        `)
        .eq('status', 'pending')
        .lte('scheduled_at', now)
    )

    if (fetchErr) throw fetchErr

    if (!dueFollowUps || dueFollowUps.length === 0) {
      return sendSuccess(res, { count: 0 })
    }

    let triggeredCount = 0

    // 2. Trigger webhook for each due follow-up
    for (const fu of dueFollowUps) {
      try {
        if (fu.type === 'video') {
          // SEGUIMIENTO 2: Two-step sequence
          // 1. Abrir ventana 24h
          await fetch('https://automation8n.fluxia.site/webhook/86b4d2df-5fea-40c8-a121-26c51a92300c', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent_slug: fu.agents?.slug,
              phone: fu.contacts?.phone
            })
          })

          // 2. Send follow-up message
          await fetch('https://automation8n.fluxia.site/webhook/a56c59a0-7b5e-4196-878f-130d2098fcd5', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: fu.contacts?.phone,
              agent_slug: fu.agents?.slug,
              contact_name: fu.contacts?.name,
              message: "Como estas? pudiste ver el video que te mande?",
              media_type: 'text'
            })
          })
        } else {
          // DEFAULT SEGUIMIENTO (Seguimientos 1)
          await fetch('https://automation8n.fluxia.site/webhook/f6cc20e3-267d-4e80-af86-da9bfe0d3608', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: fu.contacts?.phone,
              name: fu.contacts?.name,
              agent_slug: fu.agents?.slug,
              follow_up_id: fu.id
            })
          })
        }

        if (response.ok) {
          // 3. Mark as followed_up
          await safeDb(() => 
            supabase
              .from('follow_ups')
              .update({ status: 'followed_up', updated_at: new Date().toISOString() })
              .eq('id', fu.id)
          )
          
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
