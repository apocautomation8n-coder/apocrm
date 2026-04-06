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
  try {
    await client.connect()
    console.log('✅ Connected to database.')

    // Add /converter to allowed_views IF not already present
    // First, select all profiles
    const { rows } = await client.query('SELECT id, allowed_views FROM profiles')
    
    for (const row of rows) {
      if (!row.allowed_views.includes('/converter')) {
        const newViews = [...row.allowed_views, '/converter']
        await client.query('UPDATE profiles SET allowed_views = $1 WHERE id = $2', [newViews, row.id])
        console.log(`  Updated profile ${row.id}: added /converter`)
      }
    }

    console.log('\n✅ All profiles updated!')
  } catch (err) {
    console.error('❌ Error updating profiles:', err)
  } finally {
    await client.end()
  }
}

main()
