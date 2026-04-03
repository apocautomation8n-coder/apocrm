import { Router } from 'express'
import supabase from '../supabaseAdmin.js'

const router = Router()

// POST /api/messages/inbound — receive inbound message from n8n / Evolution API
router.post('/inbound', async (req, res) => {
  try {
    const { name, phone, timestamp, message, agent_slug } = req.body

    if (!phone || !agent_slug) {
      return res.status(400).json({ error: 'phone and agent_slug are required' })
    }

    // 1. Find or create contact
    let { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', phone)
      .single()

    if (!contact) {
      const { data: newContact, error: contactErr } = await supabase
        .from('contacts')
        .insert({ name: name || null, phone })
        .select('id')
        .single()
      if (contactErr) {
        console.error('Error creating contact:', contactErr)
        return res.status(500).json({ error: 'Failed to create contact' })
      }
      contact = newContact
    } else if (name) {
      // Update name if provided
      await supabase.from('contacts').update({ name }).eq('id', contact.id)
    }

    // 2. Find agent by slug
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .select('id')
      .eq('slug', agent_slug)
      .single()

    if (agentErr || !agent) {
      return res.status(404).json({ error: `Agent '${agent_slug}' not found` })
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
      console.error('Error inserting message:', msgErr)
      return res.status(500).json({ error: 'Failed to save message' })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Inbound message error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/messages/bot-outbound — receive outbound bot message from n8n to log it into CRM
router.post('/bot-outbound', async (req, res) => {
  try {
    const { phone, message, agent_slug } = req.body

    if (!phone || !agent_slug) {
      return res.status(400).json({ error: 'phone and agent_slug are required' })
    }

    // 1. Find contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', phone)
      .single()

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found. Bot outbound messages expect an existing contact.' })
    }

    // 2. Find agent by slug
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('slug', agent_slug)
      .single()

    if (!agent) {
      return res.status(404).json({ error: `Agent '${agent_slug}' not found` })
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
        is_read: true, // We sent it, so it's already "read" or doesn't trigger unread badge
      })

    if (msgErr) {
      console.error('Error inserting bot message:', msgErr)
      return res.status(500).json({ error: 'Failed to save bot message' })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Bot outbound message error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
