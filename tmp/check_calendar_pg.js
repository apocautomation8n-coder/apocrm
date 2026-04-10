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

  // List all events
  const { rows } = await client.query('SELECT id, title, date, start_time, meet_link FROM calendar_events ORDER BY date')
  
  console.log('=== Eventos en calendar_events ===')
  if (rows.length === 0) {
    console.log('  (tabla vacía)')
  } else {
    rows.forEach(e => {
      console.log(`  [${e.date}] "${e.title}" | start: ${e.start_time || '-'} | meet_link: ${e.meet_link || '(vacío)'}`)
    })
  }
  
  await client.end()
}

main().catch(console.error)
