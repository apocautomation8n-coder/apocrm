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
  `ALTER TABLE monthly_plans ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD'`
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

  console.log('\n🚀 Running monthly_plans schema update...\n')

  for (const sql of ALTER_STATEMENTS) {
    try {
      await client.query(sql)
      console.log(`  ✅ Executed: ${sql}`)
    } catch (err) {
      console.error(`  ❌ Failed: ${sql}`)
      console.error(`     ${err.message}`)
    }
  }

  await client.end()
  console.log('\n✅ Update complete!')
}

main()
