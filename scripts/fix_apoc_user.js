import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function fix() {
  const email = 'apoc@apocautomation.site'
  console.log(`Updating profiles for: ${email}`)

  const { data: profiles, error: fetchErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)

  if (fetchErr || !profiles || profiles.length === 0) {
    console.error('User not found or error:', fetchErr)
    return
  }

  for (const user of profiles) {
    console.log(`Profile ${user.id} current views:`, user.allowed_views)
    if (!user.allowed_views.includes('/followups')) {
      const updatedViews = [...user.allowed_views, '/followups']
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ allowed_views: updatedViews, updated_at: new Date() })
        .eq('id', user.id)

      if (updateErr) {
        console.error(`Error updating profile ${user.id}:`, updateErr)
      } else {
        console.log(`Successfully added /followups to profile ${user.id}`)
      }
    } else {
      console.log(`Profile ${user.id} already has /followups access`)
    }
  }
}

fix()
