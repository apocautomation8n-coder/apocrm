import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const config = {
  connectionString: `postgresql://postgres:ulIB78QjiaIrfGKC@db.kckmipvuvdbfsflxzynf.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
}

async function main() {
  const client = new pg.Client(config)
  await client.connect()
  console.log('Connected')

  await client.query(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      name TEXT NOT NULL,
      currency TEXT DEFAULT 'USD',
      balance NUMERIC DEFAULT 0,
      card_number TEXT,
      card_holder TEXT,
      notes TEXT
    )
  `)
  console.log('bank_accounts table created')
  await client.end()
}
main()
