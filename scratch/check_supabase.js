import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('Checking credential_vaults table...')
  
  // Try to query the table structure using rpc or information_schema if possible
  // In Supabase, we can use a raw SQL query if we have the service role key (which we do)
  // Butsupabase-js doesn't expose a raw sql method easily unless we use a custom function.
  
  // Alternative: try to select one row and see what columns we get
  const { data, error } = await supabase
    .from('credential_vaults')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error fetching table:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Table exists. Columns in row:', Object.keys(data[0]))
  } else {
    console.log('Table exists but is empty.')
    // Try to insert a dummy to see if it fails and why
    const { error: insertError } = await supabase
      .from('credential_vaults')
      .insert({ client_name: 'test', label: 'test', encrypted_value: 'test', iv: 'test', salt: 'test' })
    
    if (insertError) {
      console.error('Insert failed:', insertError)
    } else {
      console.log('Insert test succeeded.')
      // Cleanup
      await supabase.from('credential_vaults').delete().eq('client_name', 'test')
    }
  }
}

checkSchema()
