-- =============================================
-- APOC CRM — Bóveda de Credenciales
-- Ejecutar en: Supabase → SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS credential_vaults (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name     TEXT NOT NULL,
  category        TEXT DEFAULT 'general',
  label           TEXT NOT NULL,
  username        TEXT,
  encrypted_value TEXT NOT NULL,  -- AES-256-GCM ciphertext (Base64)
  iv              TEXT NOT NULL,  -- Initialization Vector (Base64, 12 bytes)
  salt            TEXT NOT NULL,  -- PBKDF2 salt (Base64, 16 bytes)
  url             TEXT,
  notes           TEXT,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE credential_vaults ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados pueden operar sobre sus credenciales
CREATE POLICY "auth_all" ON credential_vaults
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_cred_client ON credential_vaults (client_name);
CREATE INDEX IF NOT EXISTS idx_cred_category ON credential_vaults (category);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_credential_vaults_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_credential_vaults_updated_at
  BEFORE UPDATE ON credential_vaults
  FOR EACH ROW EXECUTE FUNCTION update_credential_vaults_updated_at();
