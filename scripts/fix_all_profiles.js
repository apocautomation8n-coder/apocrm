import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const PROJECT_REF = 'kckmipvuvdbfsflxzynf'
const DB_PASSWORD = 'ulIB78QjiaIrfGKC'

const config = {
  connectionString: `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false }
}

const ALL_VIEWS = [
  '/agents', '/metrics', '/contacts', '/pipeline', '/tasks', '/calendar', '/followups', '/finance', '/plans', '/converter', '/users'
]

async function main() {
  const client = new pg.Client(config)
  try {
    await client.connect()
    console.log('✅ Connected to database.')

    // 1. Get all users from auth.users
    console.log('\n🔍 Fetching all users from auth.users...')
    const { rows: authUsers } = await client.query('SELECT id, email FROM auth.users')
    console.log(`  Found ${authUsers.length} users in auth.`)

    // 2. Ensure every auth user has a profile
    console.log('\n👤 Syncing profiles...')
    for (const user of authUsers) {
      const { rows: existing } = await client.query('SELECT id FROM public.profiles WHERE id = $1', [user.id])
      
      if (existing.length === 0) {
        console.log(`  [+] Creating missing profile for ${user.email} (${user.id})...`)
        await client.query(
          'INSERT INTO public.profiles (id, email, allowed_views, updated_at) VALUES ($1, $2, $3, now())',
          [user.id, user.id, ALL_VIEWS] // Note: sometimes email is stored in email column, sometimes id. Following the existing schema.
        )
      } else {
        console.log(`  [*] Updating profile for ${user.email}...`)
        await client.query(
          'UPDATE public.profiles SET allowed_views = $1, updated_at = now() WHERE id = $2',
          [ALL_VIEWS, user.id]
        )
      }
    }

    console.log('\n✨ All profiles synchronized with full permissions!')
  } catch (err) {
    console.error('❌ Error during fix:', err)
  } finally {
    await client.end()
  }
}

main()
