import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kckmipvuvdbfsflxzynf.supabase.co'
const supabaseKey = 'sb_publishable_UgNy046UTCGtOsIpnVjpyw_baUOIkVr'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const dummyData = {
    client_id: 'f007d94d-0699-4a61-a2bb-e29904edd21c',
    number: 'TEST-010',
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

  const { data, error } = await supabase.from('invoices').insert([dummyData]).select()
  console.log(JSON.stringify({ data, error }, null, 2))
}

test()
