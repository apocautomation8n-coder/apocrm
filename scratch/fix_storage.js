import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const PROJECT_REF = 'kckmipvuvdbfsflxzynf'
const DB_PASSWORD = 'ulIB78QjiaIrfGKC'

const config = {
  connectionString: `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
}

async function main() {
  const client = new pg.Client(config)
  await client.connect()
  console.log('Connected to DB.')

  try {
    console.log('Applying storage policies for "resources" bucket...')

    // 1. Ensure the bucket is public (just in case)
    await client.query(`
      UPDATE storage.buckets SET public = true WHERE id = 'resources'
    `)

    // 2. Drop existing policies to avoid conflicts if they exist with different names
    // Note: We can't easily drop by name if we don't know the exact names, 
    // but the migration uses these names.
    const policies = ['Public Access', 'Allow Uploads', 'Allow Deletes', 'Allow Updates']
    for (const p of policies) {
      await client.query(`DROP POLICY IF EXISTS "${p}" ON storage.objects`).catch(() => {});
    }

    // 3. Create the policies
    await client.query(`
      CREATE POLICY "Public Access" 
      ON storage.objects FOR SELECT 
      USING ( bucket_id = 'resources' );
    `)
    console.log('✅ Policy "Public Access" created.')

    await client.query(`
      CREATE POLICY "Allow Uploads" 
      ON storage.objects FOR INSERT 
      WITH CHECK ( bucket_id = 'resources' );
    `)
    console.log('✅ Policy "Allow Uploads" created.')

    await client.query(`
      CREATE POLICY "Allow Deletes" 
      ON storage.objects FOR DELETE 
      USING ( bucket_id = 'resources' );
    `)
    console.log('✅ Policy "Allow Deletes" created.')
    
    await client.query(`
      CREATE POLICY "Allow Updates" 
      ON storage.objects FOR UPDATE
      USING ( bucket_id = 'resources' );
    `)
    console.log('✅ Policy "Allow Updates" created.')

    console.log('All policies applied successfully.')

  } catch (error) {
    console.error('Error applying policies:', error)
  } finally {
    await client.end()
  }
}

main().catch(console.error)
