
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function runMigration() {
  console.log('Running migration for finance_automations columns...')
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE finance_automations ADD COLUMN IF NOT EXISTS destination_bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
      ALTER TABLE finance_automations ADD COLUMN IF NOT EXISTS source_bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL;
    `
  })

  if (error) {
    // If RPC fails, try a direct query if possible, but let's assume RPC is disabled as before.
    // I will try to use the REST API to check if I can just add columns? No, Supabase REST doesn't support ALTER TABLE.
    console.error('Migration error (likely RPC exec_sql disabled):', error)
  } else {
    console.log('Migration successful!')
  }
}

runMigration()
