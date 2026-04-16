import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const config = {
  connectionString: 'postgresql://postgres:ulIB78QjiaIrfGKC@db.kckmipvuvdbfsflxzynf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
};

const sqls = [
  'ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY',
  'CREATE POLICY "auth_all" ON invoice_settings FOR ALL TO authenticated USING (true) WITH CHECK (true)',
  'ALTER TABLE invoice_clients ENABLE ROW LEVEL SECURITY',
  'CREATE POLICY "auth_all" ON invoice_clients FOR ALL TO authenticated USING (true) WITH CHECK (true)',
  'ALTER TABLE invoices ENABLE ROW LEVEL SECURITY',
  'CREATE POLICY "auth_all" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true)',
  'ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY',
  'CREATE POLICY "auth_all" ON invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true)',
  'ALTER TABLE invoices DISABLE ROW LEVEL SECURITY', // Alternatively, disable RLS to instantly fix it and avoid "policy already exists"
  'ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY'
];

async function run() {
  const c = new pg.Client(config);
  await c.connect();
  for (const sql of sqls) {
    try {
        await c.query(sql);
        console.log('Success:', sql);
    } catch (e) {
        console.log('Failed:', sql, e.message);
    }
  }
  await c.end();
}
run();
