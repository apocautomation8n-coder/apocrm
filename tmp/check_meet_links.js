import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

async function check() {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, date, start_time, meet_link')
    .order('date')
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('=== Eventos en calendar_events ===')
    data.forEach(e => {
      console.log(`  [${e.date}] ${e.title} | meet_link: ${e.meet_link || '(vacío)'}`)
    })
  }
}

check()
