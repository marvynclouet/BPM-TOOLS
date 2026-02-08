/**
 * Données fictives pour le mode démo (sans BDD).
 * Utilisé quand NEXT_PUBLIC_DEMO_MODE=true et cookie demo_session.
 */

const DEMO_USER_ID = 'demo-user-id'
const CLOSER1_ID = 'demo-closer-1'
const CLOSER2_ID = 'demo-closer-2'

const now = new Date()
const created = (daysAgo: number) =>
  new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

export const demoUser = {
  id: DEMO_USER_ID,
  email: 'demo@bpm-tools-demo.fr',
  role: 'admin' as const,
  full_name: 'Admin Démo',
}

export const demoClosers = [
  { id: DEMO_USER_ID, full_name: 'Admin Démo', email: 'demo@bpm-tools-demo.fr' },
  { id: CLOSER1_ID, full_name: 'Marie Dupont', email: 'marie@demo.fr' },
  { id: CLOSER2_ID, full_name: 'Thomas Martin', email: 'thomas@demo.fr' },
]

/** Liste closers + admins pour Mon espace (avec role et created_at) */
export const demoClosersList = [
  { id: DEMO_USER_ID, email: 'demo@bpm-tools-demo.fr', full_name: 'Admin Démo', created_at: created(30), role: 'admin' },
  { id: CLOSER1_ID, email: 'marie@demo.fr', full_name: 'Marie Dupont', created_at: created(60), role: 'closer' },
  { id: CLOSER2_ID, email: 'thomas@demo.fr', full_name: 'Thomas Martin', created_at: created(90), role: 'closer' },
]

export const demoLeads = [
  { id: 'l1', first_name: 'Léa', last_name: 'Martin', phone: '0612345678', email: 'lea@example.com', formation: 'inge_son', source: 'instagram', status: 'nouveau' as const, closer_id: null, created_at: created(0), users: null },
  { id: 'l2', first_name: 'Thomas', last_name: 'Bernard', phone: '0698765432', email: null, formation: 'beatmaking', source: 'tiktok', status: 'nouveau' as const, closer_id: null, created_at: created(1), users: null },
  { id: 'l3', first_name: 'Emma', last_name: 'Petit', phone: '0687654321', email: 'emma@example.com', formation: 'inge_son', source: 'direct', status: 'appele' as const, closer_id: DEMO_USER_ID, created_at: created(2), users: { full_name: 'Admin Démo', email: 'demo@bpm-tools-demo.fr' } },
  { id: 'l4', first_name: 'Hugo', last_name: 'Durand', phone: '0676543210', email: null, formation: 'beatmaking', source: 'google', status: 'nouveau' as const, closer_id: null, created_at: created(3), users: null },
  { id: 'l5', first_name: 'Chloé', last_name: 'Leroy', phone: '0665432109', email: 'chloe@example.com', formation: 'inge_son', source: 'instagram', status: 'en_cours_de_closing' as const, closer_id: CLOSER1_ID, created_at: created(4), users: { full_name: 'Marie Dupont', email: 'marie@demo.fr' } },
  { id: 'l6', first_name: 'Lucas', last_name: 'Moreau', phone: '0654321098', email: null, formation: 'autre', source: 'facebook', status: 'acompte_regle' as const, closer_id: DEMO_USER_ID, created_at: created(5), users: { full_name: 'Admin Démo', email: 'demo@bpm-tools-demo.fr' } },
  { id: 'l7', first_name: 'Manon', last_name: 'Simon', phone: '0643210987', email: 'manon@example.com', formation: 'inge_son', source: 'direct', status: 'clos' as const, closer_id: CLOSER2_ID, created_at: created(6), users: { full_name: 'Thomas Martin', email: 'thomas@demo.fr' } },
  { id: 'l8', first_name: 'Nathan', last_name: 'Laurent', phone: '0632109876', email: null, formation: 'beatmaking', source: 'tiktok', status: 'ko' as const, closer_id: CLOSER1_ID, created_at: created(7), users: { full_name: 'Marie Dupont', email: 'marie@demo.fr' } },
  { id: 'l9', first_name: 'Julie', last_name: 'Lefebvre', phone: '0621098765', email: 'julie@example.com', formation: 'inge_son', source: 'youtube', status: 'nouveau' as const, closer_id: null, created_at: created(8), users: null },
  { id: 'l10', first_name: 'Enzo', last_name: 'Michel', phone: '0610987654', email: null, formation: 'beatmaking', source: 'instagram', status: 'appele' as const, closer_id: CLOSER2_ID, created_at: created(9), users: { full_name: 'Thomas Martin', email: 'thomas@demo.fr' } },
]

export function getDemoUser() {
  return demoUser
}

export function getDemoLeads() {
  return demoLeads
}

export function getDemoClosers() {
  return demoClosers
}

export function getDemoClosersList() {
  return demoClosersList
}

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
}

export const DEMO_CREDENTIALS = {
  email: 'demo@bpm-tools-demo.fr',
  password: 'Demo123!',
}
