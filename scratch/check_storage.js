import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStorage() {
  console.log('Checking storage buckets...')
  const { data: buckets, error } = await supabase.storage.listBuckets()

  if (error) {
    console.error('Error listing buckets:', error)
    return
  }

  console.log('Buckets found:', buckets.map(b => ({ name: b.name, public: b.public, allowed_mime_types: b.allowed_mime_types, file_size_limit: b.file_size_limit })))

  const resourcesBucket = buckets.find(b => b.name === 'resources')
  if (!resourcesBucket) {
    console.log('Bucket "resources" NOT FOUND!')
  } else {
    console.log('Bucket "resources" exists.')
  }
}

checkStorage()
