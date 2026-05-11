
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function runMigration() {
  console.log('Running migration for finance_automations...')
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS finance_automations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        trigger_type TEXT CHECK (trigger_type IN ('ingreso')),
        percentage NUMERIC NOT NULL,
        destination_description TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      INSERT INTO finance_automations (name, trigger_type, percentage, destination_description)
      VALUES ('Diezmo / Ofrenda', 'ingreso', 10, 'Ofrenda Templo')
      ON CONFLICT DO NOTHING;
    `
  })

  if (error) {
    console.error('Migration error:', error)
  } else {
    console.log('Migration successful!')
  }
}

runMigration()
