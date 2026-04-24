import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log('Checking buckets...')
  const { data: buckets, error: bError } = await supabase.storage.listBuckets()
  if (bError) console.error(bError)
  else console.log('Buckets:', buckets.map(b => b.name))

  console.log('\nChecking if resource tables exist...')
  const { data: folders, error: fError } = await supabase.from('resource_folders').select('id').limit(1)
  if (fError) {
    console.log('resource_folders table does not exist or error:', fError.message)
  } else {
    console.log('resource_folders table exists')
  }

  const { data: files, error: fiError } = await supabase.from('resource_files').select('id').limit(1)
  if (fiError) {
    console.log('resource_files table does not exist or error:', fiError.message)
  } else {
    console.log('resource_files table exists')
  }
}

check()
