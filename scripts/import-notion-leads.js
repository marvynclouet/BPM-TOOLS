/**
 * Import des leads Notion (Planning des cours) vers Supabase
 * Usage: node scripts/import-notion-leads.js
 *
 * - Ne touche PAS aux leads existants
 * - Crée les leads + accounting_entries correspondantes
 * - Skip les lignes sans nom
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load .env manually (no dotenv dependency)
const envPath = path.resolve(__dirname, '../.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const val = match[2].trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Mapping produit → formation + format ──
function mapProduct(produit) {
  if (!produit) return { formation: 'autre', formation_format: null }
  const p = produit.toLowerCase().trim()

  if (p.includes('fast') && p.includes('inge')) return { formation: 'inge_son', formation_format: 'bpm_fast' }
  if (p.includes('fast') && p.includes('beat')) return { formation: 'beatmaking', formation_format: 'bpm_fast' }
  if (p.includes('semaine') && p.includes('inge')) return { formation: 'inge_son', formation_format: 'semaine' }
  if (p.includes('semaine') && p.includes('beat')) return { formation: 'beatmaking', formation_format: 'semaine' }
  if (p.includes('mois') && p.includes('inge')) return { formation: 'inge_son', formation_format: 'mensuelle' }
  if (p.includes('moi') && p.includes('inge')) return { formation: 'inge_son', formation_format: 'mensuelle' }
  if (p.includes('digital') && p.includes('inge')) return { formation: 'inge_son', formation_format: 'mensuelle' }
  if (p.includes('mois') && p.includes('beat')) return { formation: 'beatmaking', formation_format: 'mensuelle' }
  if (p.includes('beat')) return { formation: 'beatmaking', formation_format: null }
  if (p.includes('inge') || p.includes('ingé')) return { formation: 'inge_son', formation_format: null }
  return { formation: 'autre', formation_format: null }
}

// ── Mapping statut Notion → statut BDD ──
function mapStatus(statut, statutPaiement, etatFormation) {
  const s = (statut || '').toLowerCase().trim()
  const sp = (statutPaiement || '').toLowerCase().trim()
  const ef = (etatFormation || '').toLowerCase().trim()

  if (s === 'problème' || s === 'probleme') {
    if (sp.includes('problème') || sp.includes('probleme')) return 'ko'
    return 'acompte_en_cours'
  }
  if (s === 'à fixer' || s === 'a fixer') {
    if (sp.includes('attente')) return 'en_cours_de_closing'
    return 'nouveau'
  }
  if (s === 'booké' || s === 'booke') {
    if (sp === 'payé full' || sp === 'paye full') return 'clos'
    if (sp.includes('plusieurs fois')) return 'acompte_regle'
    if (sp.includes('attente')) return 'acompte_en_cours'
    if (sp.includes('problème') || sp.includes('probleme')) return 'acompte_regle'
    if (sp.includes('acc posé') || sp.includes('acc pose')) return 'acompte_regle'
    return 'clos'
  }
  return 'nouveau'
}

// ── Parse date française → YYYY-MM-DD ──
const MOIS_FR = {
  'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03', 'avril': '04',
  'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08', 'aout': '08',
  'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12', 'decembre': '12',
}

function parseDateFr(dateStr) {
  if (!dateStr) return null
  // Prendre la première date si "→" présent
  const first = dateStr.split('→')[0].trim()
  const parts = first.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
  if (!parts) return null
  const day = parts[1].padStart(2, '0')
  const month = MOIS_FR[parts[2].toLowerCase()]
  const year = parts[3]
  if (!month) return null
  return `${year}-${month}-${day}`
}

// ── Parse nombre (gère virgule décimale) ──
function parseNum(val) {
  if (!val || val.trim() === '') return 0
  return parseFloat(val.replace(',', '.')) || 0
}

// ── Parse CSV simple ──
function parseCSV(content) {
  const lines = content.split('\n')
  const headers = parseCSVLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = parseCSVLine(lines[i])
    const row = {}
    headers.forEach((h, idx) => { row[h.trim()] = (values[idx] || '').trim() })
    rows.push(row)
  }
  return rows
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += c
    }
  }
  result.push(current)
  return result
}

// ── MAIN ──
async function main() {
  const csvPath = path.resolve(__dirname, '../Planning des cours 19f15ea200338044912ae10aacf0b280.csv')
  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content)

  console.log(`📋 ${rows.length} lignes trouvées dans le CSV`)

  // Chercher les closers existants
  const { data: users } = await supabase.from('users').select('id, first_name')
  const closerMap = {}
  for (const u of (users || [])) {
    closerMap[u.first_name?.toLowerCase()] = u.id
  }
  console.log(`👥 Closers trouvés: ${Object.keys(closerMap).join(', ') || 'aucun'}`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const row of rows) {
    const nom = (row["Nom de l'élève"] || '').trim()
    if (!nom) { skipped++; continue }

    const { formation, formation_format } = mapProduct(row['Produit'])
    const status = mapStatus(row['Statut'], row['Statut paiement'], row['État de formation'])
    const startDate = parseDateFr(row['Semaine'])
    const prix = parseNum(row['Prix'])
    const acompte = parseNum(row['Acompte'])
    const soldeRestant = parseNum(row['Solde restant'])
    const versements = parseNum(row['versements effectué'])
    const salaireFormateur = parseNum(row['Salaire Formateur'])
    const benef = parseNum(row['Benef '])
    const phone = (row['Téléphone'] || '').trim()
    const closerName = (row['Closing'] || '').toLowerCase().trim()
    const closerId = closerMap[closerName] || null
    const formateur = (row['formateur'] || '').trim()
    const infos = (row['Informations '] || row['Informations'] || '').trim()
    const etatFormation = (row['État de formation'] || '').trim()
    const nbPaiement = (row['Nb de paiement'] || '').trim()
    const statutPaiement = (row['Statut paiement'] || '').trim()

    // Construire le commentaire avec les infos Notion
    const commentParts = []
    if (infos) commentParts.push(infos)
    if (formateur) commentParts.push(`Formateur: ${formateur}`)
    if (closerName && !closerId) commentParts.push(`Closer: ${row['Closing']}`)
    if (etatFormation) commentParts.push(`Formation: ${etatFormation}`)
    if (statutPaiement && statutPaiement !== 'payé full') commentParts.push(`Paiement: ${statutPaiement}`)
    if (nbPaiement) commentParts.push(`${nbPaiement}x paiement`)
    commentParts.push('(import Notion)')
    const comment = commentParts.join(' | ')

    // Insérer le lead
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        first_name: nom,
        last_name: '',
        phone: phone || 'N/A',
        formation,
        formation_format: formation_format || null,
        formation_start_date: startDate,
        status,
        source: 'direct',
        price_fixed: prix > 0 ? prix : null,
        price_deposit: acompte > 0 ? acompte : null,
        closer_id: closerId,
        comment,
        interest_level: status === 'clos' || status === 'acompte_regle' ? 'chaud' : null,
      })
      .select('id')
      .single()

    if (leadErr) {
      console.error(`❌ ${nom}: ${leadErr.message}`)
      errors++
      continue
    }

    // Créer l'entrée comptable si versement ou prix payé
    const amountPaid = versements > 0 ? versements : (statutPaiement === 'payé full' && prix > 0 ? prix : 0)

    if (amountPaid > 0) {
      const isFullyPaid = soldeRestant === 0 || statutPaiement === 'payé full'
      const entryType = isFullyPaid ? 'complet' : (acompte > 0 ? 'acompte' : 'complet')

      const { error: entryErr } = await supabase
        .from('accounting_entries')
        .insert({
          lead_id: lead.id,
          entry_type: entryType,
          amount: amountPaid,
          remaining_amount: soldeRestant > 0 ? soldeRestant : 0,
          commission_formateur: salaireFormateur > 0 ? salaireFormateur : 0,
          commission_closer: 0,
        })

      if (entryErr) {
        console.error(`  ⚠️ Compta ${nom}: ${entryErr.message}`)
      }
    }

    const statusEmoji = status === 'clos' ? '✅' : status === 'acompte_regle' ? '💰' : status === 'ko' ? '❌' : '📋'
    console.log(`${statusEmoji} ${nom} → ${status} | ${formation}/${formation_format || '-'} | ${amountPaid > 0 ? amountPaid + '€' : 'pas de paiement'}`)
    imported++
  }

  console.log(`\n════════════════════════════`)
  console.log(`✅ Importés: ${imported}`)
  console.log(`⏭️  Skippés (sans nom): ${skipped}`)
  console.log(`❌ Erreurs: ${errors}`)
  console.log(`════════════════════════════`)
}

main().catch(console.error)
