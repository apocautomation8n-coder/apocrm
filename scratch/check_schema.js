
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY 

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLabels() {
  const { data: labels, error: lError } = await supabase
    .from('labels')
    .select('*')
  
  if (lError) {
    console.error('Error fetching labels:', lError)
  } else {
    console.log('Labels:', labels)
  }

  const { data: contactLabels, error: clError } = await supabase
    .from('contact_labels')
    .select('*')
    .limit(5)
  
  if (clError) {
    console.error('Error fetching contact_labels:', clError)
  } else {
    console.log('Contact Labels sample:', contactLabels)
  }
}

checkLabels()

