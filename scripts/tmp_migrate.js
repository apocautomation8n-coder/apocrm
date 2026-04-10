import pg from 'pg'
const c = new pg.Client({connectionString:'postgresql://postgres:ulIB78QjiaIrfGKC@db.kckmipvuvdbfsflxzynf.supabase.co:5432/postgres',ssl:{rejectUnauthorized:false}})
await c.connect()
await c.query("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activo'")
console.log('Done')
await c.end()
