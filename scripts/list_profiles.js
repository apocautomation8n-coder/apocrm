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
    console.log('✅ Connected to database.\n')

    const { rows } = await client.query('SELECT * FROM profiles')
    console.log(JSON.stringify(rows, null, 2))

  } catch (err) {
    console.error('❌ Error listing profiles:', err)
  } finally {
    await client.end()
  }
}

main()
