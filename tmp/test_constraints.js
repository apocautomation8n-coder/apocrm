import pg from 'pg';
const c = new pg.Client({connectionString:'postgresql://postgres:ulIB78QjiaIrfGKC@db.kckmipvuvdbfsflxzynf.supabase.co:5432/postgres', ssl:{rejectUnauthorized:false}});
c.connect().then(()=>c.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'invoices'::regclass")).then(r => {console.log(r.rows); c.end()}).catch(console.error);
