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
  '/agents', '/metrics', '/contacts', '/pipeline', '/calendar', '/finance', '/plans', '/converter', '/users'
]

const TARGET_EMAIL = 'apoc@apocautomation.site'

async function main() {
  const client = new pg.Client(config)
  try {
    await client.connect()
    console.log('✅ Connected to database.')

    // Find the profile by email
    const { rows } = await client.query('SELECT id, full_name, allowed_views FROM profiles WHERE email = $1', [TARGET_EMAIL])
    
    if (rows.length === 0) {
      console.log(`❌ No profile found with email: ${TARGET_EMAIL}`)
      // Let's try to search by part of the email just in case
      const { rows: searchRows } = await client.query("SELECT id, email, full_name FROM profiles WHERE email ILIKE '%apoc%'")
      if (searchRows.length > 0) {
        console.log('Similar accounts found:', searchRows)
      }
      return
    }

    const profile = rows[0]
    console.log(`👤 Found profile: ${profile.full_name} (${profile.id})`)
    
    await client.query('UPDATE profiles SET allowed_views = $1 WHERE id = $2', [ALL_VIEWS, profile.id])
    console.log(`✅ Successfully updated ${TARGET_EMAIL} with all views.`)

  } catch (err) {
    console.error('❌ Error fixing profile:', err)
  } finally {
    await client.end()
  }
}

main()
