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

// Fonction pour charger le logo en base64 (convertit WEBP en PNG si nécessaire)
async function getLogoBase64(): Promise<string | null> {
  try {
    // Essayer d'abord le nouveau logo webp
    const logoWebpPath = path.join(process.cwd(), 'public', 'logo-bpm-formations.webp')
    if (fs.existsSync(logoWebpPath)) {
      // Convertir WEBP en PNG avec sharp
      const pngBuffer = await sharp(logoWebpPath).png().toBuffer()
      return `data:image/png;base64,${pngBuffer.toString('base64')}`
    }
    // Sinon utiliser l'ancien logo PNG
    const logoPngPath = path.join(process.cwd(), 'public', 'logo-bpm-tools.png')
    if (fs.existsSync(logoPngPath)) {
      const logoBuffer = fs.readFileSync(logoPngPath)
      return `data:image/png;base64,${logoBuffer.toString('base64')}`
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
  doc.setFont(undefined, 'bold')
  doc.text(title, 105, 35, { align: 'center' })
  
  // Nom de l'organisme
  doc.setFontSize(12)
  doc.setFont(undefined, 'normal')
  doc.text('BPM Formation', 105, 42, { align: 'center' })
  
  // Ligne de séparation sous le titre
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(0.5)
  doc.line(20, 48, 190, 48)
}

// Fonction utilitaire pour ajouter un logo en bas du document
async function addLogoAtBottom(doc: jsPDF) {
  const logoBase64 = await getLogoBase64()
  const pageHeight = doc.internal.pageSize.height
  
  if (logoBase64) {
    try {
      // Logo en bas, centré - taille plus grande et non compressée
      // Calculer les dimensions pour maintenir le ratio d'aspect (environ 2:1 pour un logo)
      const logoWidth = 100 // Augmenté pour éviter la compression
      const logoHeight = 40 // Augmenté proportionnellement
      const x = (210 - logoWidth) / 2 // Centrer sur une page A4 (210mm)
      const y = pageHeight - 50 // Un peu plus haut pour éviter le bord
      
      // Ajouter l'image avec compression minimale
      // Utiliser 'MEDIUM' ou 'SLOW' pour meilleure qualité, ou pas de compression
      doc.addImage(logoBase64, 'PNG', x, y, logoWidth, logoHeight, undefined, 'MEDIUM')
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
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.3)
  doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20)
  
  // Informations de contact
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.secondary)
  doc.text('BPM Formation - Formation professionnelle', 105, pageHeight - 15, { align: 'center' })
  doc.text(`Page ${pageNumber}`, 190, pageHeight - 15, { align: 'right' })
  doc.setTextColor(...COLORS.primary)
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
  doc.setFont(undefined, 'bold')
  doc.text("À l'attention de :", 20, yPos)
  yPos += 8
  
  doc.setFont(undefined, 'normal')
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
  doc.setFont(undefined, 'bold')
  doc.text('Objet : Convocation à la formation', 20, yPos)
  yPos += 10
  
  // Corps du document
  doc.setFont(undefined, 'normal')
  doc.setFontSize(10)
  const formationLabels: Record<string, string> = {
    inge_son: 'Ingénieur du son',
    beatmaking: 'Beatmaking',
    autre: 'Formation professionnelle',
  }
  const formationLabel = formationLabels[data.formation] || data.formation
  
  doc.text(`Nous avons le plaisir de vous confirmer votre inscription à la formation`, 20, yPos)
  yPos += 6
  doc.setFont(undefined, 'bold')
  doc.text(`"${formationLabel}"`, 20, yPos)
  yPos += 8
  
  doc.setFont(undefined, 'normal')
  doc.text('Détails de la formation :', 20, yPos)
  yPos += 6
  
  doc.text(`Dates : ${data.dates}`, 25, yPos)
  yPos += 6
  doc.text('Horaires : 9h00 - 17h00', 25, yPos)
  yPos += 6
  doc.text('Lieu : À confirmer', 25, yPos)
  yPos += 10
  
  // Instructions
  doc.setFont(undefined, 'bold')
  doc.text('Merci de bien vouloir :', 20, yPos)
  yPos += 6
  
  doc.setFont(undefined, 'normal')
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
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(0.5)
  doc.line(20, yPos, 100, yPos)
  yPos += 5
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.secondary)
  doc.text('Le responsable de la formation', 20, yPos)
  
  // Pied de page
  addFooter(doc, 1)
  
  // Générer le buffer
  const pdfBlob = doc.output('arraybuffer')
  return Buffer.from(pdfBlob)
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const doc = new jsPDF()
  
  // En-tête professionnel
  addHeader(doc, 'FACTURE')
  
  let yPos = 60
  
  // Informations client (à gauche)
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.text('Facturé à :', 20, yPos)
  yPos += 6
  
  doc.setFont(undefined, 'normal')
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
  
  // Date de facturation (à droite)
  const dateStr = data.date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
  doc.setFont(undefined, 'bold')
  doc.text(`Date : ${dateStr}`, 150, 60, { align: 'right' })
  
  yPos += 10
  
  // Tableau des prestations
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(0.5)
  
  // En-tête du tableau
  doc.setFont(undefined, 'bold')
  doc.setFontSize(10)
  doc.rect(20, yPos, 170, 8)
  doc.text('Désignation', 25, yPos + 5.5)
  doc.text('Quantité', 120, yPos + 5.5)
  doc.text('Prix unitaire', 150, yPos + 5.5, { align: 'right' })
  doc.text('Total', 190, yPos + 5.5, { align: 'right' })
  
  yPos += 8
  
  // Ligne de prestation
  doc.setFont(undefined, 'normal')
  const formationLabels: Record<string, string> = {
    inge_son: 'Formation Ingénieur du son',
    beatmaking: 'Formation Beatmaking',
    autre: 'Formation professionnelle',
  }
  const formationLabel = formationLabels[data.formation] || data.formation
  
  doc.rect(20, yPos, 170, 8)
  doc.text(formationLabel, 25, yPos + 5.5)
  doc.text('1', 120, yPos + 5.5)
  doc.text(`${data.amount.toFixed(2)} €`, 150, yPos + 5.5, { align: 'right' })
  doc.text(`${data.amount.toFixed(2)} €`, 190, yPos + 5.5, { align: 'right' })
  
  yPos += 15
  
  // Détails de paiement
  if (data.deposit > 0) {
    doc.setFontSize(10)
    doc.text('Détails de paiement :', 20, yPos)
    yPos += 6
    doc.text(`Acompte versé : ${data.deposit.toFixed(2)} €`, 25, yPos)
    yPos += 6
    const remaining = data.amount - data.deposit
    doc.text(`Solde restant : ${remaining.toFixed(2)} €`, 25, yPos)
    yPos += 8
  }
  
  // Total
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(0.8)
  doc.line(120, yPos, 190, yPos)
  yPos += 6
  
  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text('TOTAL TTC :', 120, yPos)
  doc.text(`${data.amount.toFixed(2)} €`, 190, yPos, { align: 'right' })
  
  yPos += 15
  
  // Conditions de paiement
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(...COLORS.secondary)
  doc.text('Conditions de paiement :', 20, yPos)
  yPos += 5
  doc.text('Paiement par virement bancaire ou lien Stripe fourni', 25, yPos)
  
  // Pied de page
  addFooter(doc, 1)
  
  // Générer le buffer
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
  doc.setFont(undefined, 'bold')
  doc.text('ATTESTATION D\'INSCRIPTION À UNE FORMATION PROFESSIONNELLE', 105, yPos, { align: 'center' })
  yPos += 15
  
  // Informations du représentant légal
  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
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
  doc.setFont(undefined, 'bold')
  doc.text('Atteste que :', 20, yPos)
  yPos += 8
  
  // Nom de l'élève en gras
  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text(`${data.firstName.toUpperCase()} ${data.lastName.toUpperCase()}`, 20, yPos)
  yPos += 10
  
  // "est inscrite à la formation professionnelle suivante :"
  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  doc.text('est inscrite à la formation professionnelle suivante :', 20, yPos)
  yPos += 10
  
  // Informations de la formation avec puces
  doc.setFontSize(10)
  
  // Calculer la durée (35h pour mensuelle, 25h pour semaine)
  const duration = data.formationFormat === 'mensuelle' ? 35 : 25
  
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
  doc.text('Lieu : RF Studio', 25, yPos)
  yPos += 10
  
  // Objectifs pédagogiques
  doc.setFont(undefined, 'bold')
  doc.text('Objectifs pédagogiques :', 20, yPos)
  yPos += 7
  
  doc.setFont(undefined, 'normal')
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
