import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDocxUpload() {
  console.log('Testing .docx upload to "resources" bucket...')
  
  const fileName = `test-${Date.now()}.docx`
  const fileBody = Buffer.from('Dummy docx content')
  
  const { data, error } = await supabase.storage
    .from('resources')
    .upload(fileName, fileBody, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })

  if (error) {
    console.error('Upload failed:', error)
  } else {
    console.log('Upload succeeded:', data)
    // Cleanup
    await supabase.storage.from('resources').remove([fileName])
  }
}

testDocxUpload()
