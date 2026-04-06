import { Router } from 'express'
import supabase from '../supabaseAdmin.js'

const router = Router()

// GET /api/users - List all users from profiles
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('Error fetching users:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/users - Create a new user (Auth + Profile)
router.post('/', async (req, res) => {
  try {
    const { email, password, full_name, allowed_views } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // 1. Create user in Supabase Auth (using Service Role Client)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (authError) {
      console.error('Auth creation error:', authError)
      return res.status(400).json({ error: authError.message })
    }

    const userId = authData.user.id

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
      console.error('Profile creation error:', profileError)
      // Cleanup: if profile fails, we might want to delete the auth user, but for now just report
      return res.status(500).json({ error: 'Failed to create user profile' })
    }

    res.status(201).json(profileData)
  } catch (err) {
    console.error('User creation endpoint error:', err)
    res.status(500).json({ error: 'Internal server error' })
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
    res.json(data)
  } catch (err) {
    console.error('Error updating user:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // 1. Delete from profiles (CASCADE handle the rest? Or manual)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (profileError) throw profileError

    // 2. Delete from Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) {
      console.error('Auth deletion error:', authError)
      // profile is already gone, auth remains. user can't log in anyway if middleware checks profiles
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Error deleting user:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
