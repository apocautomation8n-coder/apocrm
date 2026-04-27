import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function getBucketDetails() {
  const { data, error } = await supabase.storage.getBucket('resources')
  if (error) {
    console.error('Error getting bucket:', error)
  } else {
    console.log('Bucket details:', data)
  }
}

getBucketDetails()
