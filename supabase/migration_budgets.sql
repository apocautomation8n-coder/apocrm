-- Budgets (Presupuestos)

CREATE TABLE IF NOT EXISTS public.budget_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_prefix text NOT NULL DEFAULT 'PRE',
  next_number integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.budget_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  template_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  number text NOT NULL,
  sequence integer,
  prefix text,
  currency text NOT NULL DEFAULT 'ARS',
  deposit_percent integer NOT NULL DEFAULT 30,
  issue_date date DEFAULT (now()::date),
  requirements_text text,
  analysis_json jsonb,
  budget_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS budgets_number_unique ON public.budgets(number);

