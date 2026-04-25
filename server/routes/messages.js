import { Router } from 'express'
import supabase from '../supabaseAdmin.js'
import { sendSuccess, sendError, safeDb, findOrCreateContact } from '../utils.js'

const AGENT_VIDEO_LINKS = {
  talleres: 'youtube.com/watch?v=i93Yyv8REjg',
  gym: 'youtube.com/shorts/L0VKAk4YTb0',
}

const PIPELINE_STAGES = {
  NUEVO_LEAD: '0425d316-d9f6-4456-a31d-869a9c949ff3',
  INTERESADO: '58bb636f-655b-4cc0-bc38-d6b98670713f',
  DISCOVERY_AGENDADA: '20bf38cd-37b0-4c21-8a2e-c8aeac9bd210' // Note: corrected slightly if needed based on list
}
// Correction: based on list output, Discovery Agendada is 20bf38cd-37b0-4c21-8a2e-c8aeac8bd210
PIPELINE_STAGES.DISCOVERY_AGENDADA = '20bf38cd-37b0-4c21-8a2e-c8aeac8bd210'

const VIDEO_RECURRING_MESSAGES = [
  "Hola como estas? pudiste ver la info?",
  "Buenas como va la semana, queria saber si pudiste ver lo que te pasamos",
  "Hola! Paso por acá para saber si tuviste oportunidad de ver el video",
  "¿Qué tal? Cualquier duda que tengas sobre el video me avisás",
  "Hola, ¿pudiste ver el video que te envié el otro día?",
  "Buenas, ¿alguna duda con el video informativo?"
]

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

    // 4. Apply Automation Rules (Keywords -> Labels)
    try {
      const lowerMsg = (message || '').toLowerCase()
      const { data: rules } = await supabase.from('automation_rules').select('keyword, label_id')
      
      // A) Keyword Rules from DB
      if (rules && rules.length > 0) {
        for (const rule of rules) {
          if (lowerMsg.includes(rule.keyword.toLowerCase())) {
            await applyLabel(contact.id, rule.label_id)
          }
        }
      }

      // B) Custom Stateful Rule: Template Connection Response
      const { data: lastOutbound } = await supabase
        .from('messages')
        .select('content')
        .eq('contact_id', contact.id)
        .eq('direction', 'outbound')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastOutbound) {
        const lastContent = lastOutbound.content.toLowerCase()
        if (lastContent.includes('¿cómo estás?') && lastContent.includes('¿tenés un minuto?')) {
          const { data: lb } = await supabase.from('labels').select('id').ilike('name', 'Plantilla respondida').maybeSingle()
          if (lb) await applyLabel(contact.id, lb.id)
        }
      }

      // C) Custom Keyword Rule: Meeting (Reunion) -> Move to Discovery Agendada
      const meetingKeywords = ['reunion', 'agendar', 'agendado', 'agendada', 'visita', 'nos vemos', 'pasar por', 'podes pasar', 'venite', 'direccion', 'ubicacion']
      if (meetingKeywords.some(k => lowerMsg.includes(k))) {
        const { data: lb } = await supabase.from('labels').select('id').ilike('name', 'Reunion Agendada').maybeSingle()
        if (lb) await applyLabel(contact.id, lb.id)
        
        // Pipeline Move
        await movePipeline(contact.id, PIPELINE_STAGES.DISCOVERY_AGENDADA)
      }

      // D) Automatic Pipeline: Nuevo Lead (4+ messages)
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contact.id)
        .eq('direction', 'inbound')
      
      if (msgCount && msgCount >= 5) {
        // If they are not in pipeline, add to Nuevo Lead
        const { data: inPipeline } = await supabase.from('pipeline_cards').select('id').eq('contact_id', contact.id).maybeSingle()
        if (!inPipeline) {
          await supabase.from('pipeline_cards').insert({ contact_id: contact.id, stage_id: PIPELINE_STAGES.NUEVO_LEAD })
          console.log(`[PIPELINE] Created Nuevo Lead card for contact ${contact.id}`)
        }
      }

      // E) Automatic Pipeline: Interesado (Interest Keywords)
      const interestKeywords = ['interesa', 'contame', 'discovery', 'asesoramiento', 'quiero saber mas', 'precio', 'costo', 'valor']
      if (interestKeywords.some(k => lowerMsg.includes(k))) {
        // Move to Interesado ONLY if they are not already in a later stage
        await movePipeline(contact.id, PIPELINE_STAGES.INTERESADO, true)
      }

    } catch (autoErr) {
      console.error('[AUTOMATION] Error applying rules:', autoErr)
    }

    async function applyLabel(contactId, labelId) {
      const { data: existing } = await supabase
        .from('contact_labels')
        .select('*')
        .eq('contact_id', contactId)
        .eq('label_id', labelId)
        .maybeSingle()
      
      if (!existing) {
        await supabase.from('contact_labels').insert({ contact_id: contactId, label_id: labelId })
        console.log(`[AUTOMATION] Applied label ${labelId} to contact ${contactId}`)
      }
    }

    async function movePipeline(contactId, stageId, onlyForward = false) {
      const { data: existingCard } = await supabase
        .from('pipeline_cards')
        .select('id, stage_id, pipeline_stages(position)')
        .eq('contact_id', contactId)
        .maybeSingle()

      if (existingCard) {
        // If onlyForward, check position
        if (onlyForward) {
          const { data: newStage } = await supabase.from('pipeline_stages').select('position').eq('id', stageId).single()
          if (newStage && existingCard.pipeline_stages?.position >= newStage.position) {
            return // Don't move back
          }
        }

        await supabase.from('pipeline_cards').update({ stage_id: stageId }).eq('id', existingCard.id)
        console.log(`[PIPELINE] Moved contact ${contactId} to stage ${stageId}`)
      } else {
        // Create if doesn't exist
        await supabase.from('pipeline_cards').insert({ contact_id: contactId, stage_id: stageId })
        console.log(`[PIPELINE] Added contact ${contactId} to pipeline stage ${stageId}`)
      }
    }

    // 5. Cancel any pending follow-up for this contact if they replied
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
    
    // 4. Apply Automation Rules
    try {
      const lowerMsg = (message || '').toLowerCase()
      const { data: rules } = await supabase.from('automation_rules').select('keyword, label_id')
      if (rules) {
        for (const rule of rules) {
          if (lowerMsg.includes(rule.keyword.toLowerCase())) {
            await supabase.from('contact_labels').upsert({
              contact_id: contact.id,
              label_id: rule.label_id
            }, { onConflict: 'contact_id,label_id' })
          }
        }
      }
    } catch (err) { console.error('[AUTOMATION] Error:', err) }
    
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

    // New: Agent Automation for Meeting Confirmation -> Move to Discovery Agendada
    try {
      const lowerMsg = (message || '').toLowerCase()
      if (lowerMsg.includes('agendado') || lowerMsg.includes('agendada') || lowerMsg.includes('confirmado') || lowerMsg.includes('confirmada')) {
        const { data: lb } = await supabase.from('labels').select('id').ilike('name', 'Reunion Agendada').maybeSingle()
        if (lb) {
          await supabase.from('contact_labels').upsert({
            contact_id: contact.id,
            label_id: lb.id
          }, { onConflict: 'contact_id,label_id' })
        }

        // Pipeline Move
        const { data: existingCard } = await supabase.from('pipeline_cards').select('id').eq('contact_id', contact.id).maybeSingle()
        if (existingCard) {
          await supabase.from('pipeline_cards').update({ stage_id: PIPELINE_STAGES.DISCOVERY_AGENDADA }).eq('id', existingCard.id)
        } else {
          await supabase.from('pipeline_cards').insert({ contact_id: contact.id, stage_id: PIPELINE_STAGES.DISCOVERY_AGENDADA })
        }
      }
    } catch (err) {
      console.error('[AGENT-AUTOMATION] Error:', err)
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
        let success = false
        if (fu.type === 'video' || fu.type === 'video_recurring') {
          // SEGUIMIENTO 2 & 3: Two-step sequence
          // 1. Abrir ventana 24h
          const r1 = await fetch('https://automation8n.fluxia.site/webhook/86b4d2df-5fea-40c8-a121-26c51a92300c', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent_slug: fu.agents?.slug,
              phone: fu.contacts?.phone
            })
          })

          // 2. Send follow-up message
          const msg = fu.type === 'video' 
            ? "Como estas? pudiste ver el video que te mande?"
            : VIDEO_RECURRING_MESSAGES[Math.floor(Math.random() * VIDEO_RECURRING_MESSAGES.length)]

          const r2 = await fetch('https://automation8n.fluxia.site/webhook/a56c59a0-7b5e-4196-878f-130d2098fcd5', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: fu.contacts?.phone,
              agent_slug: fu.agents?.slug,
              contact_name: fu.contacts?.name,
              message: msg,
              media_type: 'text'
            })
          })
          success = r1.ok && r2.ok
        } else {
          // DEFAULT SEGUIMIENTO (Seguimientos 1)
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
          success = response.ok
        }

        if (success) {
          // 3. Mark as followed_up
          await safeDb(() => 
            supabase
              .from('follow_ups')
              .update({ status: 'followed_up', updated_at: new Date().toISOString() })
              .eq('id', fu.id)
          )

          // 4. Schedule next recurrence if it's a video follow-up
          if (fu.type === 'video' || fu.type === 'video_recurring') {
            const nextSchedule = new Date()
            nextSchedule.setHours(nextSchedule.getHours() + 23)
            
            await safeDb(() => 
              supabase
                .from('follow_ups')
                .insert({
                  contact_id: fu.contact_id,
                  agent_id: fu.agent_id,
                  status: 'pending',
                  type: 'video_recurring',
                  scheduled_at: nextSchedule.toISOString()
                })
            )
          }
          
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
