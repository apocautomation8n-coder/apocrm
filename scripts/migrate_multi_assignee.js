import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const PROJECT_REF = 'kckmipvuvdbfsflxzynf'
const DB_PASSWORD = 'ulIB78QjiaIrfGKC'

const config = {
  connectionString: `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
}

const SQL = [
  // 1. Create the join table
  `CREATE TABLE IF NOT EXISTS task_assignees (
    task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
    member_id uuid REFERENCES team_members(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, member_id)
  )`,

  // 2. Enable RLS
  `ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY`,
  `CREATE POLICY "auth_all" ON task_assignees FOR ALL TO authenticated USING (true) WITH CHECK (true)`,

  // 3. Migrate existing single assignments
  `INSERT INTO task_assignees (task_id, member_id)
   SELECT id, assigned_to FROM tasks
   WHERE assigned_to IS NOT NULL
   ON CONFLICT DO NOTHING`,
]

async function main() {
  const client = new pg.Client(config)
  try {
    await client.connect()
    console.log('✅ Connected to database.')

    for (const sql of SQL) {
      await client.query(sql)
      console.log(`  Executed: ${sql.substring(0, 50)}...`)
    }

    console.log('\n✨ Database migration complete!')
  } catch (err) {
    console.error('❌ Error during migration:', err)
  } finally {
    await client.end()
  }
}

main()
