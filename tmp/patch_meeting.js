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
  await client.connect()

  const meetLink = 'https://meet.google.com/emt-uotj-gia'
  const title = 'Joel Discovery'
  
  const { rowCount } = await client.query(
    'UPDATE calendar_events SET meet_link = $1 WHERE title = $2 AND meet_link IS NULL',
    [meetLink, title]
  )
  
  if (rowCount > 0) {
    console.log(`✅ Se actualizó el link de Meet para "${title}"`)
  } else {
    console.log(`ℹ️ No se encontró la reunión "${title}" sin link o ya tiene uno.`)
  }
  
  await client.end()
}

main().catch(console.error)
