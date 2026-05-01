import { Router } from 'express'
import supabase from '../supabaseAdmin.js'
import { normalizePhone, sendSuccess, sendError, getPhoneVariants } from '../utils.js'

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

    // Find contact by phone using variants
    const variants = getPhoneVariants(phone)
    
    const { data: contacts, error: contactErr } = await supabase
      .from('contacts')
      .select('id, bot_enabled')
      .in('phone', variants)
      .order('created_at', { ascending: true })

    if (contactErr || !contacts || contacts.length === 0) {
      return sendError(res, 'Contact not found for the given phone number', 404)
    }

    const contact = contacts[0]

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

    // Get agent info including bot_enabled
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .select('slug, bot_enabled')
      .eq('id', lastMsg.agent_id)
      .single()

    if (agentErr || !agent) {
      return sendError(res, 'Assigned agent not found in database', 404)
    }

    const isBotEnabled = (contact.bot_enabled ?? true) && (agent.bot_enabled ?? true)

    return sendSuccess(res, {
      phone: normalizedPhone,
      agent_slug: agent.slug,
      bot_enabled: isBotEnabled,
    })
  } catch (err) {
    return sendError(res, err)
  }
})

export default router
