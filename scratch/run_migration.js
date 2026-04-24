import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const PROJECT_REF = 'kckmipvuvdbfsflxzynf'
const DB_PASSWORD = 'ulIB78QjiaIrfGKC'

const config = {
  connectionString: `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
}

const SQL = `
-- Create table for folders
CREATE TABLE IF NOT EXISTS public.resource_folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  parent_id uuid REFERENCES public.resource_folders(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create table for files and notes
CREATE TABLE IF NOT EXISTS public.resource_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id uuid REFERENCES public.resource_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL, -- 'image', 'document', 'note'
  url text,
  content text,
  size bigint,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create bucket for resources
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public bucket access (since buckets is system table, doing simple inserts for policies might fail if they exist or if it's protected, but let's try the storage objects table)
-- Supabase manages storage policies via auth. 
-- We will try to create basic policies for the public schema.
`

async function main() {
  const client = new pg.Client(config)
  try {
    await client.connect()
    console.log('✅ Connected to database.')
    await client.query(SQL)
    console.log('✅ Migration SQL executed successfully.')
  } catch (err) {
    console.error('❌ Error running migration:', err)
  } finally {
    await client.end()
  }
}

main()
