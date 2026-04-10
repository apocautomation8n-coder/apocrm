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
  // Create expenses table
  `CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    currency TEXT DEFAULT 'USD',
    amount NUMERIC DEFAULT 0
  )`
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
