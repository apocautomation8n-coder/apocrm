import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const PROJECT_REF = 'kckmipvuvdbfsflxzynf'
const DB_PASSWORD = 'ulIB78QjiaIrfGKC'

const config = {
  connectionString: `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
}

const SQL = [
  // Add recurrence to calendar events
  `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none'`,
]

async function main() {
  const client = new pg.Client(config)
  try {
    await client.connect()
    console.log('✅ Connected to database.')

    for (const sql of SQL) {
      await client.query(sql)
      console.log(`  Executed: ${sql.substring(0, 50)}...`)
    }

    console.log('\n✨ Database migration complete!')
  } catch (err) {
    console.error('❌ Error during migration:', err)
  } finally {
    await client.end()
  }
}

main()
