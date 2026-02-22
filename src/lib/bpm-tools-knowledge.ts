/**
 * Documentation complète de BPM Tools – injectée dans l'assistant IA
 * pour qu'il puisse répondre à toutes les questions d'utilisation.
 */
export const BPM_TOOLS_KNOWLEDGE = `
# Documentation BPM Tools – Guide d'utilisation

BPM Tools est un CRM pour BPM Formation (formations Beatmaking et Ingénierie du son).

## Structure du site et navigation

- **Dashboard** : /dashboard – Vue d'ensemble, KPIs, stats, planning, accès rapide
- **CRM** : /dashboard/crm – Gestion des leads
- **Gestion** : /dashboard/gestion – Acomptes en cours, leads closés, documents
- **Planning** : /dashboard/planning – Formations planifiées, calendrier
- **Comptabilité** : /dashboard/comptabilite – Ventes, commissions, export (admin uniquement)
- **Mon Espace** : /dashboard/mon-espace – Profil utilisateur
- **Formulaire public** : /form – Capture de leads (sans connexion), paramètre ?source= pour le tracking (ex: ?source=tiktok)

## Rôles

- **Admin** : Accès complet (comptabilité, gestion users, tout)
- **Closer** : CRM + actions sur ses leads, stats personnelles
- **Formateur** : Lecture planning et documents (retiré du mode actuel)

## CRM (/dashboard/crm)

### Vue et filtres
- Deux vues : **Tableau** et **Trello**
- Filtres : Statut, Formation, Mois, Source, recherche par nom/téléphone
- Ajouter un lead : bouton "Ajouter un lead" en haut

### Statuts des leads
- Nouveau : lead fraîchement créé
- Appelé : a été contacté, en attente
- En cours de closing : négociation en cours
- Acompte en cours : en train de régler l'acompte
- Acompte réglé : acompte payé, reste à régler le solde
- Closé : paiement complet
- KO : lead perdu
- Chinois, Rats, NRP : statuts spécifiques

### Actions sur un lead
- Assigner un closer (admin)
- Marquer "Appelé" : ouvre WhatsApp avec message pré-rempli
- Générer lien Stripe : crée un lien de paiement
- Marquer KO / Clos
- Modifier : cliquer sur une cellule pour éditer (nom, téléphone, formation, prix, etc.)
- Commenter : ajouter des notes sur le lead
- Voir détail : modal avec historique

### Formations
- Ingé son, Beatmaking, Autre

### Sources
- Direct, Instagram, TikTok, Facebook, Google, YouTube, Manuel, Autre

## Gestion (/dashboard/gestion)

### Acomptes en cours
- Leads avec acompte réglé mais solde restant
- Actions : créer groupe WhatsApp, envoyer documents, modifier montants en compta

### Leads closés (payés en entier)
- Générer attestation + facture
- Envoyer par email ou WhatsApp
- Créer groupe WhatsApp pour la formation

### Documents
- Attestation de formation
- Facture
- Envoi par email (Resend) ou WhatsApp

## Planning (/dashboard/planning)

- Vue calendrier et liste des formations
- Formations avec dates (semaine, mensuelle, BPM Fast)
- Planifier une session : date début/fin, format, participants
- Assigner des leads (élèves) aux formations
- Les leads closés peuvent être placés automatiquement

## Comptabilité (/dashboard/comptabilite)

- Réservé aux **admins**
- Liste des ventes (accounting_entries)
- Commissions closer et formateur
- Filtre par période (date début - date fin)
- Export CSV des entrées

## Dashboard – KPIs

- Nouveaux leads (24h, 7 jours)
- Appelés : leads en attente
- Payés : clos + acompte réglé
- Closing rate : clos / (appelés + acompte + clos)
- CA du mois, évolution vs mois précédent
- Leads à relancer : appelés sans action depuis 5+ jours
- Acomptes en cours : total perçus, restant à payer
- Tendances semaine, sources des leads, prochaines formations

## Relances

- **Leads à relancer** : statut "Appelé" + dernière action > 5 jours
- Relances WhatsApp automatiques : endpoint /api/gestion/auto-relance (cron)
- Configurer CRON_SECRET dans .env pour sécuriser le cron

## Configuration technique

- **Supabase** : Auth, base PostgreSQL
- **Stripe** : Paiements
- **Resend** : Envoi emails (RESEND_API_KEY)
- **Google Calendar** : Sync planning (optionnel)
- **TikTok Events API** : Tracking leads (optionnel)
- **WhatsApp** : Messages pré-remplis (pas d'envoi auto sans API Business)

## Automatisations

1. **Lead créé** : notification email si LEAD_NOTIFICATION_EMAIL configuré
2. **Lead passé en Appelé** : lien Stripe généré, WhatsApp pré-rempli
3. **Paiement Stripe confirmé** : lead → Clos, entrée compta, documents générés, envoi email
4. **Documents** : génération PDF (attestation, facture) via jspdf

## Astuces

- Utiliser la recherche du CRM (nom ou téléphone) pour trouver rapidement un lead
- Les commentaires sur les leads sont visibles dans le détail et sur le dashboard
- Le mini planning sur le dashboard montre la semaine en cours
- L'assistant IA peut faire des synthèses et répondre à des questions sur les données
`
