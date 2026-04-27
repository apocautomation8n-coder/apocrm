import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPolicies() {
  console.log('Checking storage policies...')
  
  // Storage policies are in the storage.policies table
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    // We might not be able to query this directly via postgrest unless it's exposed
  
  if (error) {
    console.log('Cannot query storage policies via PostgREST (expected).')
    console.log('Trying to list files in "resources" to see if we can read...')
    const { data: files, error: listError } = await supabase.storage.from('resources').list()
    if (listError) {
      console.error('Error listing files:', listError)
    } else {
      console.log('Files in bucket:', files.length)
    }
  } else {
    console.log('Policies:', data)
  }
}

checkPolicies()
