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
  '/agents', 
  '/contacts', 
  '/pipeline', 
  '/tasks', 
  '/calendar', 
  '/followups', 
  '/finance', 
  '/invoices/new', 
  '/plans', 
  '/converter', 
  '/resources', 
  '/security'
]

async function main() {
  const client = new pg.Client(config)
  try {
    await client.connect()
    console.log('✅ Connected to database.')

    const { rows } = await client.query('SELECT id, allowed_views FROM profiles')
    
    for (const row of rows) {
      if (row.allowed_views.includes('/portfolio')) {
        const newViews = row.allowed_views.map(v => v === '/portfolio' ? '/resources' : v)
        // Ensure /resources is there in case someone already has it somehow
        if (!newViews.includes('/resources')) newViews.push('/resources')
        
        await client.query('UPDATE profiles SET allowed_views = $1 WHERE id = $2', [newViews, row.id])
        console.log(`  Updated profile ${row.id}: changed /portfolio to /resources`)
      } else if (!row.allowed_views.includes('/resources')) {
        const newViews = [...row.allowed_views, '/resources']
        await client.query('UPDATE profiles SET allowed_views = $1 WHERE id = $2', [newViews, row.id])
        console.log(`  Updated profile ${row.id}: added /resources`)
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
