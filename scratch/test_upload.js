import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY // Use the same key as the app

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpload() {
  console.log('Testing upload to "resources" bucket using PUBLISHABLE key...')
  
  const fileName = `test-${Date.now()}.txt`
  const fileBody = 'Hello World'
  
  const { data, error } = await supabase.storage
    .from('resources')
    .upload(fileName, fileBody, {
      contentType: 'text/plain'
    })

  if (error) {
    console.error('Upload failed:', error)
  } else {
    console.log('Upload succeeded:', data)
    // Cleanup
    await supabase.storage.from('resources').remove([fileName])
  }
}

testUpload()
