import { Router } from 'express'
import supabase from '../supabaseAdmin.js'

const router = Router()

// GET /api/agents/status?phone=5491112345678
// Returns whether the bot is enabled for the agent that last interacted with this phone number
router.get('/status', async (req, res) => {
  try {
    const { phone } = req.query

    if (!phone) {
      return res.status(400).json({ error: 'phone query param is required' })
    }

    // Find contact by phone
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', phone)
      .single()

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' })
    }

    // Find last message for this contact to get the agent_id
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('agent_id')
      .eq('contact_id', contact.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    if (!lastMsg) {
      return res.status(404).json({ error: 'No messages found for this contact' })
    }

    // Get agent info
    const { data: agent } = await supabase
      .from('agents')
      .select('slug')
      .eq('id', lastMsg.agent_id)
      .single()

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    // Get contact bot status
    const { data: contactStatus } = await supabase
      .from('contacts')
      .select('bot_enabled')
      .eq('id', contact.id)
      .single()

    res.json({
      phone,
      agent_slug: agent.slug,
      bot_enabled: contactStatus?.bot_enabled ?? true,
    })
  } catch (err) {
    console.error('Agent status error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
