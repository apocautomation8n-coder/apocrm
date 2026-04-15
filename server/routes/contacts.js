import { Router } from 'express'
import supabase from '../supabaseAdmin.js'
import { sendSuccess, sendError, safeDb, findOrCreateContact, getPhoneVariants, normalizePhone } from '../utils.js'

const router = Router()

// POST /api/contacts — create or update a contact
router.post('/', async (req, res) => {
  try {
    const { phone, name } = req.laxData

    if (!phone) {
      return sendError(res, 'phone is required', 400)
    }

    // Smart find-or-create with phone variant matching
    const { contact, error: contactErr, merged } = await findOrCreateContact(phone, name)
    
    if (contactErr || !contact) {
      return sendError(res, 'Failed to handle contact', 500)
    }

    if (merged) {
      console.log(`[CONTACTS] Auto-merged duplicate contacts for phone: ${phone}`)
    }

    return sendSuccess(res, { contactId: contact.id })
  } catch (err) {
    return sendError(res, err)
  }
})

// GET /api/contacts/check/:phone — check if a contact exists (returns boolean)
router.get('/check/:phone', async (req, res) => {
  try {
    const { phone } = req.laxData
    const variants = getPhoneVariants(phone)
    
    const { data: contacts } = await safeDb(() => 
      supabase
        .from('contacts')
        .select('id')
        .in('phone', variants)
    )

    return sendSuccess(res, { exists: !!(contacts && contacts.length > 0) })
  } catch (err) {
    return sendError(res, err)
  }
})

// GET /api/contacts/:phone — find a contact by phone
router.get('/:phone', async (req, res) => {
  try {
    const { phone } = req.laxData
    const variants = getPhoneVariants(phone)
    
    const { data: contacts, error } = await safeDb(() => 
      supabase
        .from('contacts')
        .select('*')
        .in('phone', variants)
    )

    if (error || !contacts || contacts.length === 0) {
      return sendError(res, 'Contact not found', 404)
    }

    // Return first match (if there were duplicates, findOrCreateContact will merge them next time)
    return sendSuccess(res, contacts[0])
  } catch (err) {
    return sendError(res, err)
  }
})

// GET /api/contacts/check-conversation/:phone — check if a conversation exists
router.get('/check-conversation/:phone', async (req, res) => {
  try {
    const { phone } = req.laxData
    const variants = getPhoneVariants(phone)

    // 1. Find contact by any phone variant
    const { data: contacts } = await safeDb(() => 
      supabase
        .from('contacts')
        .select('id, bot_enabled')
        .in('phone', variants)
    )

    const contact = contacts?.[0]

    if (!contact) {
      return sendSuccess(res, { exists: false, hasMessages: false })
    }

    // 2. Check for messages
    const { count } = await safeDb(() => 
      supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contact.id)
    )

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
    const { phone, name } = req.laxData

    if (!phone) {
      return sendError(res, 'phone is required', 400)
    }

    // Smart find-or-create with phone variant matching
    const { contact, error: contactErr, merged } = await findOrCreateContact(phone, name)

    if (contactErr || !contact) {
      return sendError(res, 'Failed to handle contact', 500)
    }

    if (merged) {
      console.log(`[OPEN-CONVERSATION] Auto-merged duplicate contacts for phone: ${phone}`)
    }

    return sendSuccess(res, { contactId: contact.id })
  } catch (err) {
    return sendError(res, err)
  }
})

export default router

