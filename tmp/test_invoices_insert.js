import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kckmipvuvdbfsflxzynf.supabase.co'
const supabaseKey = 'sb_publishable_UgNy046UTCGtOsIpnVjpyw_baUOIkVr'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data: clients } = await supabase.from('invoice_clients').select('id').limit(1)
  if (!clients || clients.length === 0) return console.log('no clients found')
  
  const dummyData = {
    client_id: clients[0].id,
    number: 'TEST-002',
    issue_date: '2026-04-16',
    due_date: null,
    currency: 'USD',
    exchange_rate: 1,
    iva_percent: 21,
    discount_amount: 0,
    status: 'borrador',
    payment_method: null,
    notes: null,
    subtotal: 100,
    iva_amount: 21,
    total: 121
  }

  console.log('Inserting...', dummyData)
  const { data, error } = await supabase.from('invoices').insert([dummyData]).select()
  
  if (error) {
    console.error('Supabase Error:', JSON.stringify(error, null, 2))
  } else {
    console.log('Success:', data)
  }
}

test()
