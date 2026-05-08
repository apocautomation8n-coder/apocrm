import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PROJECT_REF = 'kckmipvuvdbfsflxzynf'
const DB_PASSWORD = 'ulIB78QjiaIrfGKC'

const config = {
  connectionString: `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlPath = path.resolve(__dirname, '../supabase/migration_budgets.sql')

async function run() {
  const client = new pg.Client(config)

  try {
    await client.connect()
    console.log('✅ Connected to database.')

    const sql = fs.readFileSync(sqlPath, 'utf8')
    await client.query(sql)
    console.log('✅ Migration SQL executed successfully.')

  } catch (err) {
    console.error('❌ Error executing migration:', err)
  } finally {
    await client.end()
  }
}

run()
