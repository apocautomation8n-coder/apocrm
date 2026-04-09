import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const PROJECT_REF = 'kckmipvuvdbfsflxzynf'
const DB_PASSWORD = 'ulIB78QjiaIrfGKC'

const config = {
  connectionString: `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
}

const ALL_VIEWS = [
  '/agents', '/metrics', '/contacts', '/pipeline', '/calendar', '/finance', '/plans', '/converter', '/users'
]

async function main() {
  const client = new pg.Client(config)
  try {
    await client.connect()
    console.log('✅ Connected to database.\n')

    // Find ALL profiles
    const { rows: profiles } = await client.query('SELECT id, email, full_name, allowed_views FROM profiles')
    
    console.log('--- Current Profiles ---')
    for (const p of profiles) {
      const hasConverter = p.allowed_views?.includes('/converter')
      console.log(`ID: ${p.id} | Email: ${p.email} | Name: ${p.full_name} | Converter: ${hasConverter ? 'YES' : 'NO'}`)
      
      // Force update all to have all views, especially the converter
      if (!hasConverter) {
        console.log(`  Fixing ${p.id}...`)
        await client.query('UPDATE profiles SET allowed_views = $1 WHERE id = $2', [ALL_VIEWS, p.id])
      }
    }

    console.log('\n✨ Database fix complete!')
  } catch (err) {
    console.error('❌ Error during enhancement:', err)
  } finally {
    await client.end()
  }
}

main()
