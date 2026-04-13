import { Router } from 'express'
import supabase from '../supabaseAdmin.js'
import { normalizePhone, sendSuccess, sendError, laxParse } from '../utils.js'

const router = Router()

// POST /api/contacts — create or update a contact
router.post('/', async (req, res) => {
  try {
    const body = laxParse(req.body)
    const phone = body.phone || req.query.phone
    const name = body.name || req.query.name

    const normalizedPhone = normalizePhone(phone)

    if (!normalizedPhone) {
      return sendError(res, 'phone is required', 400)
    }

    // Use upsert to create or update contact name
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .upsert(
        { phone: normalizedPhone, name: name || null },
        { onConflict: 'phone' }
      )
      .select('id')
      .single()
    
    if (contactErr) {
      return sendError(res, 'Failed to handle contact', 500)
    }

    return sendSuccess(res, { contactId: contact.id })
  } catch (err) {
    return sendError(res, err)
  }
})

// GET /api/contacts/check/:phone — check if a contact exists (returns boolean)
router.get('/check/:phone', async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.params.phone)
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', normalizedPhone)
      .single()

    return sendSuccess(res, { exists: !!contact })
  } catch (err) {
    return sendError(res, err)
  }
})

// GET /api/contacts/:phone — find a contact by phone
router.get('/:phone', async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.params.phone)
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone', normalizedPhone)
      .single()

    if (error || !contact) {
      return sendError(res, 'Contact not found', 404)
    }

    return sendSuccess(res, contact)
  } catch (err) {
    return sendError(res, err)
  }
})

// GET /api/contacts/check-conversation/:phone — check if a conversation exists
router.get('/check-conversation/:phone', async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.params.phone)

    // 1. Find contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, bot_enabled')
      .eq('phone', normalizedPhone)
      .single()

    if (!contact) {
      return sendSuccess(res, { exists: false, hasMessages: false })
    }

    // 2. Check for messages
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('contact_id', contact.id)

    return sendSuccess(res, {
      exists: true,
      hasMessages: (count || 0) > 0,
      contactId: contact.id,
      bot_enabled: contact.bot_enabled
    })
  } catch (err) {
    return sendError(res, err)
  }
})

// POST /api/contacts/open-conversation — ensure a contact exists and is ready
router.post('/open-conversation', async (req, res) => {
  try {
    const body = laxParse(req.body)
    const phone = body.phone || req.query.phone
    const name = body.name || req.query.name

    const normalizedPhone = normalizePhone(phone)

    if (!normalizedPhone) {
      return sendError(res, 'phone is required', 400)
    }

    // 1. Find or create contact using upsert
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .upsert(
        { phone: normalizedPhone, name: name || null, bot_enabled: true },
        { onConflict: 'phone' }
      )
      .select('id')
      .single()

    if (contactErr) throw contactErr

    return sendSuccess(res, { contactId: contact.id })
  } catch (err) {
    return sendError(res, err)
  }
})

export default router
