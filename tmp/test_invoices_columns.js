import pg from 'pg';
const c = new pg.Client({connectionString:'postgresql://postgres:ulIB78QjiaIrfGKC@db.kckmipvuvdbfsflxzynf.supabase.co:5432/postgres', ssl:{rejectUnauthorized:false}});
c.connect().then(()=>c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices'")).then(r => {console.log(r.rows); c.end()}).catch(console.error);
