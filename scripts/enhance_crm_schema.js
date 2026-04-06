import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const PROJECT_REF = 'kckmipvuvdbfsflxzynf'
const DB_PASSWORD = 'ulIB78QjiaIrfGKC'

const config = {
  connectionString: `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
}

const ALTER_STATEMENTS = [
  "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email TEXT",
  "ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS meet_link TEXT"
]

const ALL_VIEWS = [
  '/agents', '/metrics', '/contacts', '/pipeline', '/calendar', '/finance', '/plans', '/converter', '/users'
]

async function main() {
  const client = new pg.Client(config)
  try {
    await client.connect()
    console.log('✅ Connected to database.\n')

    // 1. Column Updates
    for (const sql of ALTER_STATEMENTS) {
      try {
        await client.query(sql)
        console.log(`  Executed: ${sql}`)
      } catch (err) {
        console.error(`  Failed: ${sql} - ${err.message}`)
      }
    }

    // 2. Profile Access Updates (Give everyone all views)
    console.log('\n🚀 Updating user permissions...')
    const { rows: profiles } = await client.query('SELECT id, full_name, allowed_views FROM profiles')
    
    for (const profile of profiles) {
      // Check if they are missing any views
      const missing = ALL_VIEWS.some(v => !profile.allowed_views?.includes(v))
      if (missing) {
        await client.query('UPDATE profiles SET allowed_views = $1 WHERE id = $2', [ALL_VIEWS, profile.id])
        console.log(`  ✅ Updated ${profile.full_name || profile.id}: assigned all views.`)
      } else {
        console.log(`  ✅ ${profile.full_name || profile.id} already has all views.`)
      }
    }

    console.log('\n✨ Database enhancement complete!')
  } catch (err) {
    console.error('❌ Error during enhancement:', err)
  } finally {
    await client.end()
  }
}

main()
