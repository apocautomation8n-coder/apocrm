import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const config = {
  connectionString: process.env.DATABASE_URL || `postgresql://postgres:ulIB78QjiaIrfGKC@db.kckmipvuvdbfsflxzynf.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
}

async function main() {
  const client = new pg.Client(config)
  await client.connect()
  console.log('Connected to database')

  try {
    await client.query(`
      ALTER TABLE bank_accounts 
      ADD COLUMN IF NOT EXISTS cbu TEXT,
      ADD COLUMN IF NOT EXISTS alias TEXT,
      ADD COLUMN IF NOT EXISTS card_expiry TEXT,
      ADD COLUMN IF NOT EXISTS card_type TEXT;
    `)
    console.log('Successfully added cbu, alias, card_expiry, and card_type columns to bank_accounts')
  } catch (err) {
    console.error('Error during migration:', err)
  } finally {
    await client.end()
  }
}

main()
