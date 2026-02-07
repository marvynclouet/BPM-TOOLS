/**
 * Préparation prod : garder UNIQUEMENT les 5 leads listés + tous les utilisateurs (accès).
 * Supprime tout le reste (autres leads + données liées). On ne touche PAS à la table users.
 *
 * Usage: node scripts/prepare-prod-keep-leads.js
 *
 * Prérequis: .env ou .env.local avec NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 */

try {
  require('dotenv').config({ path: '.env.local' })
  require('dotenv').config({ path: '.env' })
} catch (e) {}

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (.env ou .env.local)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Numéros à GARDER – normalisés en chiffres seulement (on ne touche PAS aux users)
const PHONES_TO_KEEP = [
  '0627467272',   // Rayane ETTOUIL
  '0769191881',   // Adrien Hutchinson
  '0623668220',   // Diana Benouchene
  '0767498871',   // Isaac Kone (+33 7 67 49 88 71)
  '0686693740',   // Rayane Gouirhate (+33 6 86 69 37 40)
]

function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('33')) return digits.slice(2)
  if (digits.length === 10 && digits.startsWith('0')) return digits
  return digits
}

async function deleteInBatches(table, column, ids) {
  const BATCH = 100
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    const { error } = await supabase.from(table).delete().in(column, batch)
    if (error) console.error(`   ⚠️ ${table}:`, error.message)
  }
}

async function main() {
  const phonesSet = new Set(PHONES_TO_KEEP)

  console.log('📋 Leads à conserver (par numéro):', PHONES_TO_KEEP.join(', '))
  console.log('👤 Table users : non modifiée (tous les accès conservés)\n')

  const { data: allLeads, error: errLeads } = await supabase
    .from('leads')
    .select('id, first_name, last_name, phone')

  if (errLeads) {
    console.error('❌ Erreur lecture leads:', errLeads.message)
    process.exit(1)
  }

  const keepIds = []
  const toDeleteIds = []

  for (const lead of allLeads || []) {
    const norm = normalizePhone(lead.phone)
    const match = phonesSet.has(norm) || PHONES_TO_KEEP.some(p => norm.endsWith(p) || p.endsWith(norm))
    if (match) {
      keepIds.push(lead.id)
      console.log('  ✅ Garde:', lead.first_name, lead.last_name, lead.phone)
    } else {
      toDeleteIds.push(lead.id)
    }
  }

  console.log('\n📊 Total leads:', allLeads?.length || 0)
  console.log('   À garder:', keepIds.length)
  console.log('   À supprimer:', toDeleteIds.length)

  if (toDeleteIds.length === 0) {
    console.log('\n✅ Rien à supprimer.')
    return
  }

  // Supprimer toutes les données liées aux leads qu’on enlève (ordre pour FKs)
  console.log('\n🗑️  Suppression des données liées aux leads supprimés…')
  await deleteInBatches('accounting_entries', 'lead_id', toDeleteIds)
  await deleteInBatches('lead_payments', 'lead_id', toDeleteIds)
  await deleteInBatches('lead_comments', 'lead_id', toDeleteIds)
  await deleteInBatches('documents', 'lead_id', toDeleteIds)
  await deleteInBatches('planning', 'lead_id', toDeleteIds)
  await deleteInBatches('deals', 'lead_id', toDeleteIds)
  console.log('   Données liées supprimées.')

  // Ensuite supprimer les leads
  await deleteInBatches('leads', 'id', toDeleteIds)
  console.log('   Leads supprimés.')

  console.log('\n✅ Terminé. Il reste', keepIds.length, 'lead(s). Les utilisateurs (accès) sont inchangés.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
