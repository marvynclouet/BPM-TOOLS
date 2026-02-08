/**
 * Seed des données de démo pour la branche portfolio.
 * À lancer une seule fois sur un projet Supabase dédié (démo).
 *
 * Usage: node scripts/seed-demo.js
 * Prérequis: .env ou .env.local avec NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 *            (pointant vers le projet Supabase DÉMO)
 */

try {
  require('dotenv').config({ path: '.env.local' })
  require('dotenv').config({ path: '.env' })
} catch (e) {}

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_EMAIL = 'demo@bpm-tools-demo.fr'
const DEMO_PASSWORD = 'Demo123!'
const DEMO_NAME = 'Admin Démo'

const FAKE_LEADS = [
  { first_name: 'Léa', last_name: 'Martin', phone: '0612345678', formation: 'inge_son', source: 'instagram', status: 'nouveau' },
  { first_name: 'Thomas', last_name: 'Bernard', phone: '0698765432', formation: 'beatmaking', source: 'tiktok', status: 'nouveau' },
  { first_name: 'Emma', last_name: 'Petit', phone: '0687654321', formation: 'inge_son', source: 'direct', status: 'appele' },
  { first_name: 'Hugo', last_name: 'Durand', phone: '0676543210', formation: 'beatmaking', source: 'google', status: 'nouveau' },
  { first_name: 'Chloé', last_name: 'Leroy', phone: '0665432109', formation: 'inge_son', source: 'instagram', status: 'en_cours_de_closing' },
  { first_name: 'Lucas', last_name: 'Moreau', phone: '0654321098', formation: 'autre', source: 'facebook', status: 'acompte_regle' },
  { first_name: 'Manon', last_name: 'Simon', phone: '0643210987', formation: 'inge_son', source: 'direct', status: 'clos' },
  { first_name: 'Nathan', last_name: 'Laurent', phone: '0632109876', formation: 'beatmaking', source: 'tiktok', status: 'ko' },
  { first_name: 'Julie', last_name: 'Lefebvre', phone: '0621098765', formation: 'inge_son', source: 'youtube', status: 'nouveau' },
  { first_name: 'Enzo', last_name: 'Michel', phone: '0610987654', formation: 'beatmaking', source: 'instagram', status: 'appele' },
  { first_name: 'Sarah', last_name: 'Garcia', phone: '0609876543', formation: 'inge_son', source: 'direct', status: 'nouveau' },
  { first_name: 'Maxime', last_name: 'Roux', phone: '0698765123', formation: 'autre', source: 'google', status: 'clos' },
  { first_name: 'Camille', last_name: 'Fournier', phone: '0687651234', formation: 'inge_son', source: 'instagram', status: 'acompte_en_cours' },
  { first_name: 'Alexandre', last_name: 'Girard', phone: '0676512345', formation: 'beatmaking', source: 'tiktok', status: 'ko' },
  { first_name: 'Océane', last_name: 'Bonnet', phone: '0665123456', formation: 'inge_son', source: 'direct', status: 'nouveau' },
]

async function main() {
  console.log('🌱 Seed démo BPM Tools\n')

  let userId
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: DEMO_NAME },
    })

    if (authError) {
      if (authError.message.includes('already') || authError.message.includes('registered')) {
        const { data: list } = await supabase.auth.admin.listUsers()
        const existing = list?.users?.find(u => u.email === DEMO_EMAIL)
        if (existing) userId = existing.id
        else throw new Error(authError.message)
      } else throw authError
    } else {
      userId = authData.user?.id
    }

    if (!userId) throw new Error('Impossible d’obtenir l’ID utilisateur')

    await supabase
      .from('users')
      .upsert(
        { id: userId, email: DEMO_EMAIL, role: 'admin', full_name: DEMO_NAME, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )

    console.log('✅ Compte démo:', DEMO_EMAIL, '| Mot de passe:', DEMO_PASSWORD)
  } catch (e) {
    console.error('❌ Utilisateur démo:', e.message)
    process.exit(1)
  }

  const { data: existingLeads } = await supabase.from('leads').select('id').limit(1)
  if (existingLeads?.length > 0) {
    console.log('⚠️  Des leads existent déjà. Pour tout réinitialiser, vide la table leads puis relance le script.')
    process.exit(0)
  }

  const toInsert = FAKE_LEADS.map((l, i) => ({
    first_name: l.first_name,
    last_name: l.last_name,
    phone: l.phone,
    email: i % 3 === 0 ? `${l.first_name.toLowerCase()}.${l.last_name.toLowerCase()}@example.com` : null,
    formation: l.formation,
    source: l.source,
    status: l.status,
    closer_id: ['clos', 'acompte_regle', 'en_cours_de_closing', 'appele', 'ko'].includes(l.status) ? userId : null,
    price_fixed: ['clos', 'acompte_regle'].includes(l.status) ? 600 + Math.floor(Math.random() * 400) : null,
    price_deposit: l.status === 'acompte_regle' ? 200 : null,
  }))

  const { error: leadError } = await supabase.from('leads').insert(toInsert)
  if (leadError) {
    console.error('❌ Leads:', leadError.message)
    process.exit(1)
  }

  console.log('✅', toInsert.length, 'leads fictifs créés.')
  console.log('\n📌 Connexion démo:', DEMO_EMAIL, '/', DEMO_PASSWORD)
}

main()
