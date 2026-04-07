import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role to bypass RLS for migration
)

async function migrate() {
  console.log('--- Granting /followups access ---')
  
  // Find profiles that have /agents but not /followups
  const { data: profiles, error: fetchErr } = await supabase
    .from('profiles')
    .select('id, allowed_views')
  
  if (fetchErr) {
    console.error('Error fetching profiles:', fetchErr)
    return
  }

  for (const profile of profiles) {
    if (profile.allowed_views?.includes('/agents') && !profile.allowed_views?.includes('/followups')) {
      const updatedViews = [...profile.allowed_views, '/followups']
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ allowed_views: updatedViews })
        .eq('id', profile.id)
      
      if (updateErr) {
        console.error(`Error updating profile ${profile.id}:`, updateErr)
      } else {
        console.log(`Updated profile ${profile.id}`)
      }
    }
  }

  console.log('Done.')
}

migrate()
