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

  try {
    const buckets = ['portfolio_images', 'audio-messages']
    for (const bucket of buckets) {
      console.log(`Checking/Applying storage policies for "${bucket}" bucket...`)
      
      await client.query(`DROP POLICY IF EXISTS "Public Access" ON storage.objects`).catch(() => {});
      await client.query(`DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects`).catch(() => {});
      await client.query(`DROP POLICY IF EXISTS "Allow Deletes" ON storage.objects`).catch(() => {});
      await client.query(`DROP POLICY IF EXISTS "Allow Updates" ON storage.objects`).catch(() => {});

      await client.query(`
        CREATE POLICY "Public Access ${bucket}" ON storage.objects FOR SELECT USING ( bucket_id = '${bucket}' );
      `)
      await client.query(`
        CREATE POLICY "Allow Uploads ${bucket}" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = '${bucket}' );
      `)
      await client.query(`
        CREATE POLICY "Allow Deletes ${bucket}" ON storage.objects FOR DELETE USING ( bucket_id = '${bucket}' );
      `)
      await client.query(`
        CREATE POLICY "Allow Updates ${bucket}" ON storage.objects FOR UPDATE USING ( bucket_id = '${bucket}' );
      `)
      console.log(`✅ Policies for "${bucket}" created.`)
    }
  } catch (error) {
    console.error('Error applying policies:', error)
  } finally {
    await client.end()
  }
}

main().catch(console.error)
