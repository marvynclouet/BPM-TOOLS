// Génération de PDFs avec jsPDF

import jsPDF from 'jspdf'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

// Configuration des couleurs et styles
const COLORS = {
  primary: [0, 0, 0], // Noir
  secondary: [100, 100, 100], // Gris
  accent: [0, 0, 0], // Noir pour les accents
}

// Logo chargé avec dimensions pour préserver le ratio (éviter logo écrasé)
type LogoData = { base64: string; width: number; height: number }

async function getLogoData(): Promise<LogoData | null> {
  try {
    // Essayer d'abord avec fs (pour développement local et build)
    try {
      const logoWebpPath = path.join(process.cwd(), 'public', 'logo-bpm-formations.webp')
      if (fs.existsSync(logoWebpPath)) {
        const pipeline = sharp(logoWebpPath)
        const meta = await pipeline.metadata()
        const pngBuffer = await pipeline.png().toBuffer()
        const w = meta.width ?? 1
        const h = meta.height ?? 1
        return { base64: `data:image/png;base64,${pngBuffer.toString('base64')}`, width: w, height: h }
      }
      const logoPngPath = path.join(process.cwd(), 'public', 'logo-bpm-tools.png')
      if (fs.existsSync(logoPngPath)) {
        const logoBuffer = fs.readFileSync(logoPngPath)
        const meta = await sharp(logoBuffer).metadata()
        const w = meta.width ?? 1
        const h = meta.height ?? 1
        return { base64: `data:image/png;base64,${logoBuffer.toString('base64')}`, width: w, height: h }
      }
    } catch (fsError) {
      // Si fs échoue (Vercel serverless), essayer avec fetch
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
          || 'http://localhost:3000'
        const webpUrl = `${baseUrl}/logo-bpm-formations.webp`
        const webpResponse = await fetch(webpUrl)
        if (webpResponse.ok) {
          const webpBuffer = Buffer.from(await webpResponse.arrayBuffer())
          const pipeline = sharp(webpBuffer)
          const meta = await pipeline.metadata()
          const pngBuffer = await pipeline.png().toBuffer()
          const w = meta.width ?? 1
          const h = meta.height ?? 1
          return { base64: `data:image/png;base64,${pngBuffer.toString('base64')}`, width: w, height: h }
        }
        const pngUrl = `${baseUrl}/logo-bpm-tools.png`
        const pngResponse = await fetch(pngUrl)
        if (pngResponse.ok) {
          const pngBuffer = Buffer.from(await pngResponse.arrayBuffer())
          const meta = await sharp(pngBuffer).metadata()
          const w = meta.width ?? 1
          const h = meta.height ?? 1
          return { base64: `data:image/png;base64,${pngBuffer.toString('base64')}`, width: w, height: h }
        }
      } catch (fetchError) {
        console.error('Erreur chargement logo (fetch):', fetchError)
      }
    }
  } catch (error) {
    console.error('Erreur chargement logo:', error)
  }
  return null
}

// Fonction utilitaire pour ajouter un en-tête professionnel (pour convocation/facture)
function addHeader(doc: jsPDF, title: string) {
  // Titre principal centré
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 105, 35, { align: 'center' })
  
  // Nom de l'organisme
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('BPM Formation', 105, 42, { align: 'center' })
  
  // Ligne de séparation sous le titre
  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.setLineWidth(0.5)
  doc.line(20, 48, 190, 48)
}

// Fonction utilitaire pour ajouter un logo en bas du document (ratio préservé, pas écrasé)
async function addLogoAtBottom(doc: jsPDF) {
  const logoData = await getLogoData()
  const pageHeight = doc.internal.pageSize.height
  const pageWidth = doc.internal.pageSize.width

  if (logoData) {
    try {
      // Boîte max en mm (A4) : largeur 90, hauteur 50 — on respecte le ratio du logo
      const maxW = 90
      const maxH = 50
      const ratio = logoData.width / logoData.height
      let w: number
      let h: number
      if (ratio > maxW / maxH) {
        w = maxW
        h = maxW / ratio
      } else {
        h = maxH
        w = maxH * ratio
      }
      const x = (pageWidth - w) / 2
      const y = pageHeight - 55
      doc.addImage(logoData.base64, 'PNG', x, y, w, h, undefined, 'MEDIUM')
    } catch (error) {
      console.error('Erreur ajout logo:', error)
    }
  }
}

// Fonction utilitaire pour ajouter un pied de page
function addFooter(doc: jsPDF, pageNumber: number) {
  const pageHeight = doc.internal.pageSize.height
  const pageWidth = doc.internal.pageSize.width
  
  // Ligne de séparation
  doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2])
  doc.setLineWidth(0.3)
  doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20)
  
  // Informations de contact
  doc.setFontSize(8)
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2])
  doc.text('BPM Formation - Formation professionnelle', 105, pageHeight - 15, { align: 'center' })
  doc.text(`Page ${pageNumber}`, 190, pageHeight - 15, { align: 'right' })
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
}

interface ConvocationData {
  firstName: string
  lastName: string
  phone: string
  email: string
  formation: string
  dates: string
  date: Date
}

interface InvoiceData {
  firstName: string
  lastName: string
  phone: string
  email: string
  formation: string
  amount: number
  deposit: number
  date: Date
}

export async function generateConvocationPDF(data: ConvocationData): Promise<Buffer> {
  const doc = new jsPDF()
  
  // En-tête professionnel
  addHeader(doc, 'CONVOCATION')
  
  let yPos = 60
  
  // Section "À l'attention de"
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text("À l'attention de :", 20, yPos)
  yPos += 8
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${data.firstName} ${data.lastName}`, 25, yPos)
  yPos += 6
  if (data.phone) {
    doc.text(`Téléphone : ${data.phone}`, 25, yPos)
    yPos += 6
  }
  if (data.email) {
    doc.text(`Email : ${data.email}`, 25, yPos)
    yPos += 10
  }
  
  // Section "Objet"
  doc.setFont('helvetica', 'bold')
  doc.text('Objet : Convocation à la formation', 20, yPos)
  yPos += 10
  
  // Corps du document
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const formationLabels: Record<string, string> = {
    inge_son: 'Ingénieur du son',
    beatmaking: 'Beatmaking',
    autre: 'Formation professionnelle',
  }
  const formationLabel = formationLabels[data.formation] || data.formation
  
  doc.text(`Nous avons le plaisir de vous confirmer votre inscription à la formation`, 20, yPos)
  yPos += 6
  doc.setFont('helvetica', 'bold')
  doc.text(`"${formationLabel}"`, 20, yPos)
  yPos += 8
  
  doc.setFont('helvetica', 'normal')
  doc.text('Détails de la formation :', 20, yPos)
  yPos += 6
  
  doc.text(`Dates : ${data.dates}`, 25, yPos)
  yPos += 6
  doc.text('Horaires : 9h00 - 17h00', 25, yPos)
  yPos += 6
  doc.text('Lieu : 10 rue de Paris, Piscop', 25, yPos)
  yPos += 10
  
  // Instructions
  doc.setFont('helvetica', 'bold')
  doc.text('Merci de bien vouloir :', 20, yPos)
  yPos += 6
  
  doc.setFont('helvetica', 'normal')
  doc.text('• Vous présenter 15 minutes avant le début de la formation', 25, yPos)
  yPos += 6
  doc.text('• Apporter une pièce d\'identité', 25, yPos)
  yPos += 6
  doc.text('• Prévoir de quoi prendre des notes', 25, yPos)
  yPos += 12
  
  // Date et lieu d'émission
  const dateStr = data.date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
  doc.setFontSize(9)
  doc.text(`Fait le ${dateStr}`, 20, yPos)
  yPos += 8
  
  // Signature
  doc.setFontSize(10)
  doc.text('Signature et cachet :', 20, yPos)
  yPos += 15
  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.setLineWidth(0.5)
  doc.line(20, yPos, 100, yPos)
  yPos += 5
  doc.setFontSize(8)
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2])
  doc.text('Le responsable de la formation', 20, yPos)
  
  // Pied de page
  addFooter(doc, 1)
  
  // Générer le buffer
  const pdfBlob = doc.output('arraybuffer')
  return Buffer.from(pdfBlob)
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const doc = new jsPDF()
  const total = data.amount

  addHeader(doc, 'FACTURE')

  let yPos = 58

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Facturé à :', 20, yPos)
  yPos += 6

  doc.setFont('helvetica', 'normal')
  doc.text(`${data.firstName} ${data.lastName}`, 20, yPos)
  yPos += 6
  if (data.phone) {
    doc.text(`Téléphone : ${data.phone}`, 20, yPos)
    yPos += 6
  }
  if (data.email) {
    doc.text(`Email : ${data.email}`, 20, yPos)
    yPos += 6
  }

  const dateStr = data.date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  doc.setFont('helvetica', 'bold')
  doc.text(`Date : ${dateStr}`, 190, 58, { align: 'right' })
  doc.setFont('helvetica', 'normal')

  yPos = Math.max(yPos, 78) + 8

  const tableLeft = 20
  const tableRight = 190
  const tableWidth = tableRight - tableLeft
  const colDesignationEnd = 102
  const colQteEnd = 118
  const colPrixEnd = 155
  const rowH = 9
  const rowHData = 12
  const pad = 4

  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.setLineWidth(0.4)

  doc.rect(tableLeft, yPos, tableWidth, rowH)
  doc.line(colDesignationEnd, yPos, colDesignationEnd, yPos + rowH)
  doc.line(colQteEnd, yPos, colQteEnd, yPos + rowH)
  doc.line(colPrixEnd, yPos, colPrixEnd, yPos + rowH)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Désignation', tableLeft + pad, yPos + 5.5, { maxWidth: colDesignationEnd - tableLeft - pad * 2 })
  doc.text('Qté', colDesignationEnd + pad, yPos + 5.5, { maxWidth: colQteEnd - colDesignationEnd - pad })
  doc.text('Prix unit.', colQteEnd + pad, yPos + 5.5, { maxWidth: colPrixEnd - colQteEnd - pad * 2 })
  doc.text('Total', tableRight - pad, yPos + 5.5, { align: 'right' })

  yPos += rowH

  const formationLabels: Record<string, string> = {
    inge_son: 'Formation Ingénieur du son',
    beatmaking: 'Formation Beatmaking',
    autre: 'Formation professionnelle',
  }
  const formationLabel = formationLabels[data.formation] || data.formation
  const designationWidth = colDesignationEnd - tableLeft - pad * 2

  doc.rect(tableLeft, yPos, tableWidth, rowHData)
  doc.line(colDesignationEnd, yPos, colDesignationEnd, yPos + rowHData)
  doc.line(colQteEnd, yPos, colQteEnd, yPos + rowHData)
  doc.line(colPrixEnd, yPos, colPrixEnd, yPos + rowHData)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(formationLabel, tableLeft + pad, yPos + 6, { maxWidth: designationWidth })
  doc.text('1', colDesignationEnd + pad, yPos + 6, { maxWidth: colQteEnd - colDesignationEnd - pad })
  doc.text(`${total.toFixed(2)} €`, colPrixEnd - pad, yPos + 6, { align: 'right', maxWidth: colPrixEnd - colQteEnd - pad * 2 })
  doc.text(`${total.toFixed(2)} €`, tableRight - pad, yPos + 6, { align: 'right', maxWidth: tableRight - colPrixEnd - pad * 2 })

  yPos += rowHData + 12

  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.setLineWidth(0.5)
  doc.line(colPrixEnd, yPos, tableRight, yPos)
  yPos += 6

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Total :', tableLeft, yPos)
  doc.text(`${total.toFixed(2)} €`, tableRight - pad, yPos, { align: 'right' })
  yPos += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2])
  doc.text('TVA non applicable, article 293 B du CGI', tableLeft, yPos)
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  yPos += 8

  if (data.deposit > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Détails de paiement :', tableLeft, yPos)
    yPos += 6
    doc.setFont('helvetica', 'normal')
    doc.text(`Acompte versé : ${data.deposit.toFixed(2)} €`, tableLeft + 5, yPos)
    yPos += 6
    const remaining = total - data.deposit
    doc.text(`Solde restant : ${remaining.toFixed(2)} €`, tableLeft + 5, yPos)
    yPos += 10
  }

  doc.setFontSize(9)
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2])
  doc.text('Conditions de paiement :', tableLeft, yPos)
  yPos += 5
  doc.text('Paiement par virement bancaire ou lien Stripe fourni', tableLeft + 5, yPos)
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])

  addFooter(doc, 1)

  const pdfBlob = doc.output('arraybuffer')
  return Buffer.from(pdfBlob)
}

// Nouvelle fonction pour générer une attestation de formation
interface AttestationData {
  firstName: string
  lastName: string
  phone: string
  email: string
  formation: string
  dates: string
  periodText?: string // Texte formaté pour la période (ex: "du 04 au 25 janvier 2026 sur 4 dimanches")
  date: Date
  formationFormat?: string | null // 'mensuelle' ou 'semaine'
  representativeName?: string // Nom du représentant légal
}

export async function generateAttestationPDF(data: AttestationData): Promise<Buffer> {
  const doc = new jsPDF()
  
  let yPos = 30
  
  // Titre principal
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('ATTESTATION D\'INSCRIPTION À UNE FORMATION PROFESSIONNELLE', 105, yPos, { align: 'center' })
  yPos += 15
  
  // Informations du représentant légal
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  const representativeName = data.representativeName || 'Marvyn Clouet'
  doc.text(`Je soussigné ${representativeName}, représentant légal de BPM Formation`, 20, yPos)
  yPos += 8
  
  // Informations de l'entreprise
  doc.setFontSize(10)
  doc.text('SIREN : 980 963 169', 20, yPos)
  yPos += 6
  doc.text('Adresse : 25 rue de Ponthieu, 75008 Paris', 20, yPos)
  yPos += 6
  doc.text('Mail : bpmformation2025@gmail.com', 20, yPos)
  yPos += 6
  doc.text('Tél : 06 58 36 49 15', 20, yPos)
  yPos += 10
  
  // "Atteste que :"
  doc.setFont('helvetica', 'bold')
  doc.text('Atteste que :', 20, yPos)
  yPos += 8
  
  // Nom de l'élève en gras
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`${data.firstName.toUpperCase()} ${data.lastName.toUpperCase()}`, 20, yPos)
  yPos += 10
  
  // "est inscrit(e) à la formation professionnelle suivante :" (neutre pour les deux genres)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('est inscrit(e) à la formation professionnelle suivante :', 20, yPos)
  yPos += 10
  
  // Informations de la formation avec puces
  doc.setFontSize(10)
  
  // Durée de la formation : 35 heures
  const duration = 35
  
  // Utiliser le periodText fourni directement
  const periodText = data.periodText || 'Dates à définir'
  
  const formationLabels: Record<string, string> = {
    inge_son: 'BPM Masterclass – Ingénierie Sonore',
    beatmaking: 'BPM Masterclass – Beatmaking',
    autre: 'Formation professionnelle',
  }
  const formationLabel = formationLabels[data.formation] || data.formation
  
  // Puces pour les informations (utiliser un tiret simple qui s'affiche toujours correctement)
  doc.text('-', 20, yPos)
  doc.text(`Intitulé de la formation : ${formationLabel}`, 25, yPos)
  yPos += 7
  
  doc.text('-', 20, yPos)
  doc.text(`Durée : ${duration} heures`, 25, yPos)
  yPos += 7
  
  doc.text('-', 20, yPos)
  doc.text(`Période : ${periodText}`, 25, yPos)
  yPos += 7
  
  doc.text('-', 20, yPos)
  doc.text('Horaires : de 10h00 à 18h00', 25, yPos)
  yPos += 7
  
  doc.text('-', 20, yPos)
  doc.text('Lieu : 10 rue de Paris, Piscop', 25, yPos)
  yPos += 10
  
  // Objectifs pédagogiques
  doc.setFont('helvetica', 'bold')
  doc.text('Objectifs pédagogiques :', 20, yPos)
  yPos += 7
  
  doc.setFont('helvetica', 'normal')
  doc.text('Acquisition des compétences en enregistrement, mixage, mastering et beatmaking, en vue', 20, yPos, { maxWidth: 170 })
  yPos += 6
  doc.text('de développer une autonomie professionnelle dans le domaine de l\'ingénierie sonore.', 20, yPos, { maxWidth: 170 })
  yPos += 15
  
  // Date et lieu d'émission
  const dateStr = data.date.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  })
  doc.setFontSize(10)
  doc.text(`Fait à Paris, le ${dateStr}`, 20, yPos)
  yPos += 20
  
  // Logo en bas
  await addLogoAtBottom(doc)
  
  // Générer le buffer
  const pdfBlob = doc.output('arraybuffer')
  return Buffer.from(pdfBlob)
}
