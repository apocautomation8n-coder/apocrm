import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const PROJECT_REF = 'kckmipvuvdbfsflxzynf'
const DB_PASSWORD = 'ulIB78QjiaIrfGKC'

const connectionString = `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`

const SQL_STATEMENTS = [
  // Add status column
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo';`
]

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    await client.connect()
    console.log('Connected to DB')
    
    for (const sql of SQL_STATEMENTS) {
      console.log('Executing:', sql.substring(0, 50) + '...')
      await client.query(sql)
    }
    
    console.log('Data successfully loaded!')
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await client.end()
  }
}

main()
