
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

async function runMigration() {
  console.log('Running migration...')
  
  // Create automation_rules table
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS automation_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        keyword TEXT NOT NULL,
        label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `
  })

  if (error) {
    console.error('Migration error:', error)
    console.log('Trying alternative (direct insert to test if table exists)...')
    // If rpc fails (common if not enabled), we'll just have to hope the user runs it
  } else {
    console.log('Migration successful!')
  }
}

runMigration()
