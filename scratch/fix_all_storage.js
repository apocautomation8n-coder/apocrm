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
    const buckets = ['resources', 'portfolio_images', 'audio-messages']
    
    // First, let's drop any potential conflicting policies from previous attempts
    const genericPolicies = ['Public Access', 'Allow Uploads', 'Allow Deletes', 'Allow Updates']
    for (const p of genericPolicies) {
      await client.query(`DROP POLICY IF EXISTS "${p}" ON storage.objects`).catch(() => {});
    }

    for (const bucket of buckets) {
      console.log(`Applying policies for bucket: ${bucket}`)
      
      // Use unique names for each bucket to avoid accidental drops
      const pNames = {
        select: `view_${bucket}`,
        insert: `upload_${bucket}`,
        update: `update_${bucket}`,
        delete: `delete_${bucket}`
      }

      for (const name of Object.values(pNames)) {
        await client.query(`DROP POLICY IF EXISTS "${name}" ON storage.objects`).catch(() => {});
      }

      await client.query(`
        CREATE POLICY "${pNames.select}" ON storage.objects FOR SELECT USING ( bucket_id = '${bucket}' );
      `)
      await client.query(`
        CREATE POLICY "${pNames.insert}" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = '${bucket}' );
      `)
      await client.query(`
        CREATE POLICY "${pNames.update}" ON storage.objects FOR UPDATE USING ( bucket_id = '${bucket}' );
      `)
      await client.query(`
        CREATE POLICY "${pNames.delete}" ON storage.objects FOR DELETE USING ( bucket_id = '${bucket}' );
      `)
      
      console.log(`✅ Policies for "${bucket}" applied.`)
    }

    console.log('All storage policies fixed.')

  } catch (error) {
    console.error('Error fixing policies:', error)
  } finally {
    await client.end()
  }
}

main().catch(console.error)
