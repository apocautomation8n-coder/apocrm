import { Router } from 'express'
import supabase from '../supabaseAdmin.js'

const router = Router()

// POST /api/contacts — create or update a contact
router.post('/', async (req, res) => {
  try {
    const { name, phone } = req.body

    if (!phone) {
      return res.status(400).json({ error: 'phone is required' })
    }

    // 1. Find existing contact
    let { data: contact } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('phone', phone)
      .single()

    if (!contact) {
      // 2. Create new contact
      const { data: newContact, error: contactErr } = await supabase
        .from('contacts')
        .insert({ name: name || null, phone })
        .select('id')
        .single()
      
      if (contactErr) {
        console.error('Error creating contact:', contactErr)
        return res.status(500).json({ error: 'Failed to create contact' })
      }
      return res.status(201).json({ success: true, contactId: newContact.id, created: true })
    } else {
      // 3. Update name if provided and different
      if (name && name !== contact.name) {
        const { error: updateErr } = await supabase
          .from('contacts')
          .update({ name })
          .eq('id', contact.id)
        
        if (updateErr) {
          console.error('Error updating contact name:', updateErr)
          // Non-critical error, we still return success but log it
        }
      }
      return res.json({ success: true, contactId: contact.id, created: false })
    }
  } catch (err) {
    console.error('Contact endpoint error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/contacts/check/:phone — check if a contact exists (returns boolean)
router.get('/check/:phone', async (req, res) => {
  try {
    const { phone } = req.params
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', phone)
      .single()

    res.json({ exists: !!contact })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/contacts/:phone — find a contact by phone
router.get('/:phone', async (req, res) => {
  try {
    const { phone } = req.params
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone', phone)
      .single()

    if (error || !contact) {
      return res.status(404).json({ error: 'Contact not found' })
    }

    res.json(contact)
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
