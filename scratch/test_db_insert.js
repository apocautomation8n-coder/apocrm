import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDbInsert() {
  console.log('Testing insert to "resource_files" using PUBLISHABLE key...')
  
  const { data, error } = await supabase
    .from('resource_files')
    .insert({
      name: 'Test File',
      type: 'document',
      url: 'https://example.com/test.txt',
      size: 100
    })
    .select()

  if (error) {
    console.error('Insert failed:', error)
  } else {
    console.log('Insert succeeded:', data)
    // Cleanup
    await supabase.from('resource_files').delete().eq('id', data[0].id)
  }
}

testDbInsert()
