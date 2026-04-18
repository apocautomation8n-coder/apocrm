import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function run() {
  console.log('Creating portfolio_projects table...')
  
  const query = `
    CREATE TABLE IF NOT EXISTS public.portfolio_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      url TEXT,
      image_url TEXT,
      demo_username TEXT,
      demo_password TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Allow all users to read portfolio_projects"
      ON public.portfolio_projects
      FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY "Allow all users to insert portfolio_projects"
      ON public.portfolio_projects
      FOR INSERT
      TO authenticated
      WITH CHECK (true);

    CREATE POLICY "Allow all users to update portfolio_projects"
      ON public.portfolio_projects
      FOR UPDATE
      TO authenticated
      USING (true);

    CREATE POLICY "Allow all users to delete portfolio_projects"
      ON public.portfolio_projects
      FOR DELETE
      TO authenticated
      USING (true);
  `

  const { error } = await supabase.rpc('exec_sql', { query_string: query })
  
  if (error) {
    console.error('Failed using rpc, trying direct insert if table exists or checking error:', error.message)
    // If rpc fails, we'll try to use a postgres function if it exists, or just tell the user to run it in SQL editor
    console.log('\n--- PLEASE RUN THIS SQL IN SUPABASE SQL EDITOR ---')
    console.log(query)
    console.log('---------------------------------------------------\n')
  } else {
    console.log('Table portfolio_projects created successfully.')
  }
}

run()
