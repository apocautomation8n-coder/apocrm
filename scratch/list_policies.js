import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const PROJECT_REF = 'kckmipvuvdbfsflxzynf'
const DB_PASSWORD = 'ulIB78QjiaIrfGKC'

const config = {
  connectionString: `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
}

async function listPolicies() {
  const client = new pg.Client(config)
  await client.connect()

  try {
    const { rows } = await client.query(`
      SELECT polname, polcmd, polqual, polwithcheck 
      FROM pg_policy 
      WHERE polrelid = 'storage.objects'::regclass
    `)
    console.log('Current policies on storage.objects:')
    rows.forEach(r => {
      console.log(`- ${r.polname} (${r.polcmd}): qual=${r.polqual}, with_check=${r.polwithcheck}`)
    })
  } catch (error) {
    console.error('Error listing policies:', error)
  } finally {
    await client.end()
  }
}

listPolicies()
