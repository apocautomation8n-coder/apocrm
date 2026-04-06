import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const PROJECT_REF = 'kckmipvuvdbfsflxzynf'
const DB_PASSWORD = 'ulIB78QjiaIrfGKC'

const connections = [
  {
    name: 'Direct connection',
    connectionString: `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false }
  },
  {
    name: 'Pooler (session mode)',
    connectionString: `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    ssl: { rejectUnauthorized: false }
  }
]

const ALTER_STATEMENTS = [
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS section TEXT`,
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS client TEXT`,
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS responsible TEXT`,
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0`,
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS collected NUMERIC DEFAULT 0`,
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS freelancer_fee NUMERIC DEFAULT 0`,
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS freelancer_paid NUMERIC DEFAULT 0`,
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS pending_freelancer NUMERIC DEFAULT 0`,
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS remaining NUMERIC DEFAULT 0`,
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS net_profit NUMERIC DEFAULT 0`,
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS notes TEXT`,
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo'`,
  `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ARS'`
]

async function tryConnect(config) {
  const client = new pg.Client({
    connectionString: config.connectionString,
    ssl: config.ssl,
    connectionTimeoutMillis: 10000,
  })
  try {
    await client.connect()
    console.log(`✅ Connected via: ${config.name}`)
    return client
  } catch (err) {
    console.log(`❌ Failed: ${config.name} — ${err.message}`)
    return null
  }
}

async function main() {
  let client = null

  for (const config of connections) {
    client = await tryConnect(config)
    if (client) break
  }

  if (!client) {
    console.error('\n❌ Could not connect to Supabase PostgreSQL.')
    process.exit(1)
  }

  console.log('\n🚀 Running finance_transactions schema updates...\n')

  for (let i = 0; i < ALTER_STATEMENTS.length; i++) {
    const sql = ALTER_STATEMENTS[i]
    try {
      await client.query(sql)
      console.log(`  [${i + 1}/${ALTER_STATEMENTS.length}] ✅ Executed: ${sql}`)
    } catch (err) {
      console.error(`  [${i + 1}/${ALTER_STATEMENTS.length}] ❌ Failed: ${sql}`)
      console.error(`     ${err.message}`)
    }
  }

  await client.end()
  console.log('\n✅ Update complete!')
}

main()
