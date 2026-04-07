import { Router } from 'express'
import supabase from '../supabaseAdmin.js'
import { sendSuccess, sendError } from '../utils.js'

const router = Router()

// GET /api/users - List all users from profiles
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return sendSuccess(res, data)
  } catch (err) {
    return sendError(res, err)
  }
})

// POST /api/users - Create a new user (Auth + Profile)
router.post('/', async (req, res) => {
  let userId = null
  try {
    const { email, password, full_name, allowed_views } = req.body

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400)
    }

    // 1. Create user in Supabase Auth (using Service Role Client)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (authError) {
      return sendError(res, authError.message, 400)
    }

    userId = authData.user.id

    // 2. Create profile in public.profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name,
        allowed_views: allowed_views || ['/agents', '/contacts']
      })
      .select()
      .single()

    if (profileError) {
      // Cleanup: if profile fails, delete the auth user
      await supabase.auth.admin.deleteUser(userId)
      return sendError(res, 'Failed to create user profile. Auth user rolled back.', 500)
    }

    return sendSuccess(res, profileData, 201)
  } catch (err) {
    // Attempt cleanup if we have a userId but reached an unexpected error
    if (userId) {
      await supabase.auth.admin.deleteUser(userId).catch(e => console.error('Cleanup failed:', e))
    }
    return sendError(res, err)
  }
})

// PATCH /api/users/:id - Update user permissions/metadata
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { allowed_views, full_name } = req.body

    const updateData = {}
    if (allowed_views) updateData.allowed_views = allowed_views
    if (full_name) updateData.full_name = full_name
    updateData.updated_at = new Date()

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return sendSuccess(res, data)
  } catch (err) {
    return sendError(res, err)
  }
})

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // 1. Delete from profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (profileError) throw profileError

    // 2. Delete from Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) {
      console.error('Auth deletion error:', authError)
    }

    return sendSuccess(res, { success: true })
  } catch (err) {
    return sendError(res, err)
  }
})

export default router
