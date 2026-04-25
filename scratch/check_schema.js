
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY // using publishable key as anon key

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  const { data, error } = await supabase
    .from('follow_ups')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error fetching follow_ups:', error)
  } else {
    console.log('Follow-up record:', data[0])
    console.log('Columns:', Object.keys(data[0] || {}))
  }
}

checkSchema()

