import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

// Try multiple connection approaches
const PROJECT_REF = 'kckmipvuvdbfsflxzynf'
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY

const DB_PASSWORD = 'ulIB78QjiaIrfGKC'

// Connection options to try
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
  },
  {
    name: 'Pooler (transaction mode)',
    connectionString: `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    ssl: { rejectUnauthorized: false }
  },
]

const SQL_STATEMENTS = [
  // AGENTS
  `CREATE TABLE IF NOT EXISTS agents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    bot_enabled BOOLEAN DEFAULT true,
    manual_sent INTEGER DEFAULT 0,
    manual_replied INTEGER DEFAULT 0,
    manual_followups INTEGER DEFAULT 0,
    manual_unanswered INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,
  
  `ALTER TABLE agents ADD COLUMN IF NOT EXISTS manual_sent INTEGER DEFAULT 0`,
  `ALTER TABLE agents ADD COLUMN IF NOT EXISTS manual_replied INTEGER DEFAULT 0`,
  `ALTER TABLE agents ADD COLUMN IF NOT EXISTS manual_followups INTEGER DEFAULT 0`,
  `ALTER TABLE agents ADD COLUMN IF NOT EXISTS manual_unanswered INTEGER DEFAULT 0`,

  `INSERT INTO agents (name, slug) VALUES ('Talleres', 'talleres'), ('Clínicas', 'clinicas'), ('Gym', 'gym') ON CONFLICT (slug) DO NOTHING`,

  // CONTACTS
  `CREATE TABLE IF NOT EXISTS contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    phone TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,

  // MESSAGES
  `CREATE TABLE IF NOT EXISTS messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id uuid REFERENCES agents(id),
    contact_id uuid REFERENCES contacts(id),
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    content TEXT,
    media_url TEXT,
    media_type TEXT DEFAULT 'text',
    is_read BOOLEAN DEFAULT false,
    timestamp TIMESTAMPTZ DEFAULT now()
  )`,

  // PIPELINE STAGES
  `CREATE TABLE IF NOT EXISTS pipeline_stages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,

  `INSERT INTO pipeline_stages (name, color, position) VALUES
    ('Nuevo Lead', '#6366f1', 1),
    ('Contactado', '#3b82f6', 2),
    ('Interesado', '#f59e0b', 3),
    ('Demo Agendada', '#8b5cf6', 4),
    ('Propuesta Enviada', '#ec4899', 5),
    ('Cerrado Ganado', '#10b981', 6),
    ('Cerrado Perdido', '#ef4444', 7)
  ON CONFLICT DO NOTHING`,

  // PIPELINE CARDS
  `CREATE TABLE IF NOT EXISTS pipeline_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id uuid REFERENCES contacts(id),
    stage_id uuid REFERENCES pipeline_stages(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`,

  // FINANCE
  `CREATE TABLE IF NOT EXISTS finance_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT CHECK (type IN ('ingreso', 'egreso')) NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    category TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,

  // MONTHLY PLANS
  `CREATE TABLE IF NOT EXISTS monthly_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    freelancer TEXT,
    monthly_fee NUMERIC NOT NULL,
    freelancer_fee NUMERIC DEFAULT 0,
    expenses NUMERIC DEFAULT 0,
    start_date DATE,
    status TEXT DEFAULT 'activo',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,

  // CALENDAR EVENTS
  `CREATE TABLE IF NOT EXISTS calendar_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TEXT,
    end_time TEXT,
    description TEXT,
    guests TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  )`,

  // SEED MONTHLY PLANS
  `INSERT INTO monthly_plans (client_name, freelancer, monthly_fee, freelancer_fee, expenses, status, notes)
  SELECT * FROM (VALUES
    ('Jesus', 'Mati', 50::numeric, 15::numeric, 0::numeric, 'activo', null::text),
    ('María Belén', 'Eze', 50, 0, 0, 'activo', null),
    ('MundoLaser', 'Eze', 50, 0, 0, 'activo', null),
    ('Odoo', 'Eze', 50, 0, 51, 'activo', null),
    ('Clases CapoL', 'Gustavo/Hernan', 500, 300, 0, 'activo', 'por 3 meses según duren los cursos')
  ) AS v(client_name, freelancer, monthly_fee, freelancer_fee, expenses, status, notes)
  WHERE NOT EXISTS (SELECT 1 FROM monthly_plans LIMIT 1)`,

  // RLS
  `ALTER TABLE agents ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE contacts ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE messages ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE pipeline_cards ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE monthly_plans ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY`,

  // POLICIES
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all' AND tablename = 'agents') THEN
      CREATE POLICY "auth_all" ON agents FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all' AND tablename = 'contacts') THEN
      CREATE POLICY "auth_all" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all' AND tablename = 'messages') THEN
      CREATE POLICY "auth_all" ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all' AND tablename = 'pipeline_stages') THEN
      CREATE POLICY "auth_all" ON pipeline_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all' AND tablename = 'pipeline_cards') THEN
      CREATE POLICY "auth_all" ON pipeline_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all' AND tablename = 'finance_transactions') THEN
      CREATE POLICY "auth_all" ON finance_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all' AND tablename = 'monthly_plans') THEN
      CREATE POLICY "auth_all" ON monthly_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all' AND tablename = 'calendar_events') THEN
      CREATE POLICY "auth_all" ON calendar_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
  END $$`,

  // STORAGE BUCKET
  `INSERT INTO storage.buckets (id, name, public) VALUES ('audio-messages', 'audio-messages', true) ON CONFLICT (id) DO NOTHING`,

  // STORAGE POLICIES
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_audio_read' AND tablename = 'objects') THEN
      CREATE POLICY "public_audio_read" ON storage.objects FOR SELECT USING (bucket_id = 'audio-messages');
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_audio_insert' AND tablename = 'objects') THEN
      CREATE POLICY "auth_audio_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audio-messages');
    END IF;
  END $$`,

  // REALTIME
  `ALTER PUBLICATION supabase_realtime ADD TABLE messages`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE agents`,
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
    console.error('\n❌ Could not connect to Supabase PostgreSQL with any method.')
    console.error('Please provide your database password from:')
    console.error('Supabase Dashboard → Project Settings → Database → Connection string')
    process.exit(1)
  }

  console.log('\n🚀 Running migrations...\n')

  for (let i = 0; i < SQL_STATEMENTS.length; i++) {
    const sql = SQL_STATEMENTS[i]
    const preview = sql.trim().substring(0, 60).replace(/\n/g, ' ')
    try {
      await client.query(sql)
      console.log(`  [${i + 1}/${SQL_STATEMENTS.length}] ✅ ${preview}...`)
    } catch (err) {
      // Some errors are expected (e.g., already exists)
      if (err.message.includes('already exists') || err.message.includes('already member')) {
        console.log(`  [${i + 1}/${SQL_STATEMENTS.length}] ⏭️  ${preview}... (already exists)`)
      } else {
        console.error(`  [${i + 1}/${SQL_STATEMENTS.length}] ❌ ${preview}...`)
        console.error(`     ${err.message}`)
      }
    }
  }

  await client.end()
  console.log('\n✅ Migration complete!')
}

main()
