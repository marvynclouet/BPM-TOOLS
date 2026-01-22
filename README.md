# BPM Tools

Outil interne de gestion CRM et automatisation pour formations (Ingé son / Beatmaking).

## Stack technique

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Supabase (Auth + PostgreSQL + Storage + Edge Functions)
- **Paiements**: Stripe
- **Calendrier**: Google Calendar API
- **Style**: Design minimaliste "Apple-like" (noir/blanc)

## Structure du projet

```
├── src/
│   ├── app/                    # Pages Next.js (App Router)
│   │   ├── dashboard/         # Dashboard et pages protégées
│   │   ├── form/              # Formulaire public de capture leads
│   │   ├── login/             # Page de connexion
│   │   └── api/               # API routes (webhooks, etc.)
│   ├── components/            # Composants React réutilisables
│   │   ├── auth/              # Composants d'authentification
│   │   ├── crm/               # Composants CRM
│   │   ├── comptabilite/      # Composants comptabilité
│   │   ├── planning/          # Composants planning
│   │   └── layout/            # Layouts
│   ├── lib/                   # Utilitaires et helpers
│   │   ├── supabase/          # Clients Supabase (client/server/middleware)
│   │   ├── auth.ts            # Helpers d'authentification
│   │   ├── stripe.ts          # Client Stripe
│   │   ├── documents.ts       # Génération de documents PDF
│   │   ├── email.ts           # Envoi d'emails
│   │   └── google-calendar.ts # Sync Google Calendar
│   └── types/                 # Types TypeScript
├── supabase/
│   ├── migrations/            # Migrations SQL
│   └── functions/             # Edge Functions Supabase
└── public/                    # Assets statiques
```

## Installation

1. **Cloner le projet et installer les dépendances**

```bash
npm install
```

2. **Configurer les variables d'environnement**

**⚠️ IMPORTANT :** Créez un fichier `.env.local` à la racine du projet :

```bash
cp env.template .env.local
```

Puis remplissez les valeurs dans `.env.local` :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=your_google_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALENDAR_REFRESH_TOKEN=your_google_refresh_token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Configurer Supabase**

- Créer un projet Supabase
- Exécuter la migration `supabase/migrations/001_initial_schema.sql`
- Configurer les RLS policies selon vos besoins
- Créer un bucket Storage `documents` pour les PDFs

4. **Lancer le projet**

```bash
npm run dev
```

## Rôles et permissions

- **Admin**: Accès complet (gestion users, paramètres, toutes les données)
- **Closer**: CRM + actions sur leads assignés, stats personnelles
- **Formateur**: Lecture planning + documents, liste apprenants

## Fonctionnalités principales

### 1. Formulaire public (`/form`)

Capture de leads sans authentification. Paramètre `?source=ig` pour tracking.

### 2. Dashboard (`/dashboard`)

KPIs :
- Leads nouveaux (24h / 7j)
- Appelés
- Payés
- Closing rate

### 3. CRM (`/dashboard/crm`)

- Liste des leads avec filtres (statut, formation, closer, date)
- Actions : assigner closer, marquer "Appelé", générer lien Stripe, marquer KO
- Workflow : Nouveau → À appeler → Appelé → Lien envoyé → Payé → Clos

### 4. Comptabilité (`/dashboard/comptabilite`)

- Liste des ventes payées/closées
- Calcul automatique des commissions (closer + formateur)
- Export CSV/Excel
- Totaux et statistiques

### 5. Planning (`/dashboard/planning`)

- Vue calendrier/liste des formations planifiées
- Auto-placement des clients payés
- Synchronisation Google Calendar

## Automatisations

### Quand un lead passe en "Appelé"

1. Création/attachement d'un "deal"
2. Génération d'un lien Stripe Payment Link
3. Ouverture WhatsApp avec message pré-rempli

### Webhook Stripe (paiement confirmé)

1. Mise à jour lead : `Payé` → `Clos`
2. Création ligne "vente" en compta (montant + commissions)
3. Génération documents PDF (facture + convocation + attestation)
4. Stockage dans Supabase Storage
5. Envoi email au client avec documents
6. Ajout au planning + push Google Calendar

## API Routes

- `POST /api/stripe/webhook` : Webhook Stripe pour paiements
- `POST /api/stripe/create-link` : Création d'un lien de paiement Stripe

## Edge Functions Supabase

- `stripe-webhook` : Alternative au webhook Next.js (optionnel)

## TODO / À implémenter

### V1.1 (Qualité)
- [ ] Templates messages/emails paramétrables
- [ ] Gestion erreurs complète + logs
- [ ] Génération PDF réelle (facture, convocation, attestation)
- [ ] Envoi emails fonctionnel (Resend/SendGrid)
- [ ] Sync Google Calendar fonctionnelle

### V2 (Automation avancée)
- [ ] Relances auto 24/48/72h
- [ ] KO automatique après X relances
- [ ] Offre Fast (optionnel)

## Développement

```bash
# Dev
npm run dev

# Build
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

## Déploiement

### Vercel (recommandé)

1. Connecter le repo GitHub
2. Configurer les variables d'environnement
3. Déployer

### Autres plateformes

Le projet est compatible avec toute plateforme supportant Next.js (Netlify, Railway, etc.).

## Notes techniques

- **RLS (Row Level Security)** : Activé sur toutes les tables Supabase
- **Middleware** : Gestion de session Supabase automatique
- **Types** : Types générés depuis Supabase (à régénérer après changements DB)
- **Storage** : Bucket `documents` pour PDFs générés

## Support

Pour toute question, voir la spec produit dans le repo ou contacter l'équipe dev.
