import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log('Fetching users...')
  const { data: users, error } = await supabase.from('users').select('*')
  if (error) {
    console.error(error)
    return
  }

  for (const u of users) {
    let views = u.allowed_views || []
    if (!views.includes('/invoices')) {
      views.push('/invoices')
      views.push('/invoices/new')
      await supabase.from('users').update({ allowed_views: views }).eq('id', u.id)
      console.log(`Updated user ${u.email}`)
    }
  }

  console.log('Done mapping labels')
  // Check label exact name
  const { data: labels } = await supabase.from('labels').select('*')
  console.log('Labels in DB:', labels.map(l => l.name))
}

run()
