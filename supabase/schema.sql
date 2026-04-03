-- =============================================
-- APOC CRM — Supabase Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- AGENTS
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  bot_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO agents (name, slug) VALUES
  ('Talleres', 'talleres'),
  ('Clínicas', 'clinicas'),
  ('Gym', 'gym')
ON CONFLICT (slug) DO NOTHING;

-- CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  phone TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id),
  contact_id uuid REFERENCES contacts(id),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  content TEXT,
  media_url TEXT,
  media_type TEXT DEFAULT 'text',
  is_read BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- PIPELINE STAGES
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO pipeline_stages (name, color, position) VALUES
  ('Nuevo Lead', '#6366f1', 1),
  ('Contactado', '#3b82f6', 2),
  ('Interesado', '#f59e0b', 3),
  ('Demo Agendada', '#8b5cf6', 4),
  ('Propuesta Enviada', '#ec4899', 5),
  ('Cerrado Ganado', '#10b981', 6),
  ('Cerrado Perdido', '#ef4444', 7);

-- PIPELINE CARDS
CREATE TABLE IF NOT EXISTS pipeline_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id),
  stage_id uuid REFERENCES pipeline_stages(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- FINANCE TRANSACTIONS
CREATE TABLE IF NOT EXISTS finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('ingreso', 'egreso')) NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  category TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MONTHLY PLANS
CREATE TABLE IF NOT EXISTS monthly_plans (
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
);

-- Seed: Mensualidades actuales
INSERT INTO monthly_plans (client_name, freelancer, monthly_fee, freelancer_fee, expenses, status, notes) VALUES
  ('Jesus', 'Mati', 50, 15, 0, 'activo', null),
  ('María Belén', 'Eze', 50, 0, 0, 'activo', null),
  ('MundoLaser', 'Eze', 50, 0, 0, 'activo', null),
  ('Odoo', 'Eze', 50, 0, 51, 'activo', null),
  ('Clases CapoL', 'Gustavo/Hernan', 500, 300, 0, 'activo', 'por 3 meses según duren los cursos');

-- CALENDAR EVENTS (local table, can be synced with Google Calendar later)
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  description TEXT,
  guests TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can do everything
CREATE POLICY "auth_all" ON agents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON pipeline_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON pipeline_cards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON finance_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON monthly_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON calendar_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- SUPABASE STORAGE: bucket for audio messages
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-messages', 'audio-messages', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public_audio_read" ON storage.objects FOR SELECT USING (bucket_id = 'audio-messages');
CREATE POLICY "auth_audio_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audio-messages');

-- =============================================
-- REALTIME: Enable realtime for messages table
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
