import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const PROJECT_REF = 'kckmipvuvdbfsflxzynf'
const DB_PASSWORD = 'ulIB78QjiaIrfGKC'

const config = {
  connectionString: `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
}

const SQL_STATEMENTS = [
  // 1. Labels System
  `CREATE TABLE IF NOT EXISTS labels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#7a9e82',
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS contact_labels (
    contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
    label_id uuid REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (contact_id, label_id)
  )`,

  // 2. Tareas System - Team Members
  `CREATE TABLE IF NOT EXISTS team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#7a9e82',
    created_at TIMESTAMPTZ DEFAULT now()
  )`,

  // 3. Tareas System - Tasks
  `CREATE TABLE IF NOT EXISTS tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_to uuid REFERENCES team_members(id),
    created_by uuid REFERENCES team_members(id),
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
    due_date DATE,
    due_time TIME,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('baja', 'normal', 'alta', 'urgente')),
    tags TEXT[],
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,

  // 4. Tareas System - Notifications
  `CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid REFERENCES team_members(id),
    task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('asignada', 'vencimiento', 'movida', 'comentario')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,

  // RLS (Simplified as per user request to allow everyone)
  `ALTER TABLE labels ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE contact_labels ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE team_members ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE tasks ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE notifications ENABLE ROW LEVEL SECURITY`,

  `CREATE POLICY "auth_all" ON labels FOR ALL TO authenticated USING (true) WITH CHECK (true)`,
  `CREATE POLICY "auth_all" ON contact_labels FOR ALL TO authenticated USING (true) WITH CHECK (true)`,
  `CREATE POLICY "auth_all" ON team_members FOR ALL TO authenticated USING (true) WITH CHECK (true)`,
  `CREATE POLICY "auth_all" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true)`,
  `CREATE POLICY "auth_all" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true)`,
]

const ALL_VIEWS = [
  '/agents', '/metrics', '/contacts', '/pipeline', '/tasks', '/calendar', '/followups', '/finance', '/plans', '/converter', '/users'
]

async function main() {
  const client = new pg.Client(config)
  try {
    await client.connect()
    console.log('✅ Connected to database.\n')

    // 1. Run Table Creation
    for (const sql of SQL_STATEMENTS) {
      try {
        await client.query(sql)
        console.log(`  Executed: ${sql.substring(0, 50)}...`)
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.error(`  Failed: ${sql.substring(0, 50)}... - ${err.message}`)
        }
      }
    }

    // 2. Initial Data
    console.log('\n👤 Seeding initial data...')
    const { rows: members } = await client.query('SELECT name FROM team_members')
    if (members.length === 0) {
      await client.query("INSERT INTO team_members (name, avatar_color) VALUES ('Ale', '#7a9e82'), ('Eze', '#6b7db3')")
      console.log('  ✅ Added default members: Ale & Eze.')
    }

    // 3. Update Permissions
    console.log('\n🚀 Updating user permissions for /tasks...')
    const { rows: profiles } = await client.query('SELECT id, full_name FROM profiles')
    for (const profile of profiles) {
      await client.query('UPDATE profiles SET allowed_views = $1 WHERE id = $2', [ALL_VIEWS, profile.id])
      console.log(`  ✅ Updated ${profile.full_name || profile.id}: assigned all views including /tasks.`)
    }

    console.log('\n✨ Database initialization complete!')
  } catch (err) {
    console.error('❌ Error during initialization:', err)
  } finally {
    await client.end()
  }
}

main()
