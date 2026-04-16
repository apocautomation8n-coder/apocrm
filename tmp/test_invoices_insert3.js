import dotenv from 'dotenv'
dotenv.config()
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const dummyData = {
    client_id: 'f007d94d-0699-4a61-a2bb-e29904edd21c',
    number: 'TEST-012',
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
  console.log('Result:', JSON.stringify({ data, error }, null, 2))
}

test()
