/**
 * Script de deduplicación de contactos
 * 
 * Busca contactos duplicados por variantes de teléfono argentino (con/sin 9)
 * y los fusiona automáticamente, manteniendo el más antiguo.
 * 
 * Uso: node scripts/dedup_contacts.js
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

function normalizePhone(phone) {
  if (!phone) return null
  let digits = phone.toString().replace(/\D/g, '')
  if (!digits) return null
  let clean = '+' + digits
  if (clean.startsWith('+549')) {
    clean = '+54' + clean.slice(4)
  }
  return clean
}

function getPhoneVariants(phone) {
  const canonical = normalizePhone(phone)
  if (!canonical) return []
  if (canonical.startsWith('+54')) {
    return [canonical, '+549' + canonical.slice(3)]
  }
  return [canonical]
}

async function mergeContacts(targetId, sourceId, targetPhone, sourcePhone) {
  console.log(`  🔀 Merging ${sourceId} (${sourcePhone}) → ${targetId} (${targetPhone})`)
  
  // Move messages
  const { data: msgs } = await supabase.from('messages').select('id').eq('contact_id', sourceId)
  if (msgs?.length) {
    await supabase.from('messages').update({ contact_id: targetId }).eq('contact_id', sourceId)
    console.log(`    📨 Moved ${msgs.length} messages`)
  }

  // Move pipeline cards
  const { data: cards } = await supabase.from('pipeline_cards').select('id').eq('contact_id', sourceId)
  if (cards?.length) {
    await supabase.from('pipeline_cards').update({ contact_id: targetId }).eq('contact_id', sourceId)
    console.log(`    📋 Moved ${cards.length} pipeline cards`)
  }

  // Move follow-ups
  const { data: fus } = await supabase.from('follow_ups').select('id').eq('contact_id', sourceId)
  if (fus?.length) {
    await supabase.from('follow_ups').update({ contact_id: targetId }).eq('contact_id', sourceId)
    console.log(`    📌 Moved ${fus.length} follow-ups`)
  }

  // Move labels
  const { data: labels } = await supabase.from('contact_labels').select('label_id').eq('contact_id', sourceId)
  if (labels?.length) {
    for (const l of labels) {
      await supabase.from('contact_labels').insert({ contact_id: targetId, label_id: l.label_id }).select()
    }
    await supabase.from('contact_labels').delete().eq('contact_id', sourceId)
    console.log(`    🏷️  Moved ${labels.length} labels`)
  }

  // Delete source
  await supabase.from('contacts').delete().eq('id', sourceId)
  console.log(`    ✅ Deleted duplicate ${sourceId}`)
}

async function main() {
  console.log('🔍 Fetching all contacts...')
  const { data: allContacts, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching contacts:', error)
    return
  }

  console.log(`📊 Total contacts: ${allContacts.length}`)

  // Group by canonical phone
  const groups = {}
  for (const c of allContacts) {
    const canonical = normalizePhone(c.phone)
    if (!canonical) continue
    if (!groups[canonical]) groups[canonical] = []
    groups[canonical].push(c)
  }

  // Find duplicates
  const dupeGroups = Object.entries(groups).filter(([_, contacts]) => contacts.length > 1)

  if (dupeGroups.length === 0) {
    console.log('\n✨ No duplicate contacts found! Everything is clean.')
    return
  }

  console.log(`\n⚠️  Found ${dupeGroups.length} groups of duplicate contacts:\n`)

  let totalMerged = 0

  for (const [canonical, contacts] of dupeGroups) {
    console.log(`\n📱 ${canonical} (${contacts.length} duplicates):`)
    contacts.forEach((c, i) => {
      console.log(`  ${i === 0 ? '👑 KEEP' : '❌ DUPE'}: id=${c.id} phone=${c.phone} name="${c.name || ''}" created=${c.created_at}`)
    })

    const main = contacts[0] // Keep the oldest
    
    // Merge all duplicates into main
    for (let i = 1; i < contacts.length; i++) {
      await mergeContacts(main.id, contacts[i].id, main.phone, contacts[i].phone)
      totalMerged++
    }

    // Normalize the main contact's phone to canonical form
    if (main.phone !== canonical) {
      await supabase.from('contacts').update({ phone: canonical }).eq('id', main.id)
      console.log(`  📝 Normalized phone: ${main.phone} → ${canonical}`)
    }
  }

  console.log(`\n🎉 Done! Merged ${totalMerged} duplicate contacts.`)
}

main().catch(console.error)
