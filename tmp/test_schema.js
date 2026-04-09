import { supabase } from '../src/lib/supabaseClient.js'

async function check() {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error fetching data:', error)
  } else {
    console.log('Columns:', Object.keys(data[0] || {}))
  }
}

check()
