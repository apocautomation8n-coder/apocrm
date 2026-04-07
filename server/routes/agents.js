import { Router } from 'express'
import supabase from '../supabaseAdmin.js'
import { normalizePhone, sendSuccess, sendError } from '../utils.js'

const router = Router()

// GET /api/agents/status?phone=5491112345678
// Returns whether the bot is enabled for the agent that last interacted with this phone number
// GET /api/agents/status?phone=5491112345678
// Returns whether the bot is enabled for the agent that last interacted with this phone number
router.get('/status', async (req, res) => {
  try {
    const { phone } = req.query
    const normalizedPhone = normalizePhone(phone)

    if (!normalizedPhone) {
      return sendError(res, 'phone query param is required', 400)
    }

    // Find contact by phone
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('id, bot_enabled')
      .eq('phone', normalizedPhone)
      .single()

    if (contactErr || !contact) {
      return sendError(res, 'Contact not found for the given phone number', 404)
    }

    // Find last message for this contact to get the agent_id
    const { data: lastMsg, error: lastMsgErr } = await supabase
      .from('messages')
      .select('agent_id')
      .eq('contact_id', contact.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastMsgErr) {
      return sendError(res, 'Error fetching last message', 500)
    }

    if (!lastMsg) {
      return sendError(res, 'No previous interaction found for this contact. Cannot determine agent.', 404)
    }

    // Get agent info
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .select('slug')
      .eq('id', lastMsg.agent_id)
      .single()

    if (agentErr || !agent) {
      return sendError(res, 'Assigned agent not found in database', 404)
    }

    return sendSuccess(res, {
      phone: normalizedPhone,
      agent_slug: agent.slug,
      bot_enabled: contact.bot_enabled ?? true,
    })
  } catch (err) {
    return sendError(res, err)
  }
})

export default router
