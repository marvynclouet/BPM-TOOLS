# Architecture BPM Tools

## Vue d'ensemble

BPM Tools est une application Next.js full-stack utilisant Supabase comme backend. L'architecture est conçue pour être **légère, maintenable et sans "usine à gaz"**.

## Stack

```
┌─────────────────────────────────────────┐
│         Next.js 14 (App Router)         │
│  ┌───────────────────────────────────┐   │
│  │   Pages (Server Components)       │   │
│  │   + Client Components             │   │
│  └───────────────────────────────────┘   │
│  ┌───────────────────────────────────┐   │
│  │   API Routes (Webhooks, etc.)     │   │
│  └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            Supabase                      │
│  ┌──────────┬──────────┬─────────────┐  │
│  │   Auth   │ Postgres  │   Storage   │  │
│  └──────────┴──────────┴─────────────┘  │
│  ┌───────────────────────────────────┐   │
│  │   Edge Functions (optionnel)      │   │
│  └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    Stripe    Google Calendar  WhatsApp
```

## Flux de données

### 1. Authentification

```
User → Login Form → Supabase Auth → Session Cookie → Middleware → Protected Routes
```

- **Middleware** : Vérifie la session à chaque requête
- **RLS** : Filtre les données selon le rôle utilisateur
- **Server Components** : Récupèrent l'utilisateur via `getCurrentUser()`

### 2. Capture de lead (Formulaire public)

```
Public Form → POST /api/leads (ou direct Supabase) → leads table → Statut: "nouveau"
```

- Pas d'authentification requise
- RLS policy `Public insert leads` permet l'insertion

### 3. Workflow CRM

```
Lead "Nouveau" 
  → Assigner Closer 
  → "À appeler" 
  → Action "Marquer appelé" 
  → "Appelé" 
  → Générer lien Stripe 
  → "Lien envoyé" 
  → Webhook Stripe 
  → "Payé" → "Clos"
```

### 4. Webhook Stripe

```
Stripe → POST /api/stripe/webhook → Vérification signature → Event processing
  → Update deal → Create payment → Update lead → Create sales_ledger
  → Generate documents → Send email → Add to planning → Sync Google Calendar
```

## Structure des données

### Tables principales

1. **users** : Extension de `auth.users` avec rôle
2. **leads** : Leads clients avec statut et assignation
3. **deals** : Sessions Stripe liées aux leads
4. **payments** : Paiements confirmés
5. **sales_ledger** : Comptabilité (montants + commissions)
6. **documents** : Références aux PDFs générés
7. **planning** : Événements de formation
8. **settings** : Paramètres app (prix, commissions, templates)

### Relations

```
leads (1) ──→ (N) deals
deals (1) ──→ (1) payments
payments (1) ──→ (1) sales_ledger
leads (1) ──→ (N) documents
leads (1) ──→ (1) planning
users (1) ──→ (N) leads (closer_id)
```

## Sécurité

### Row Level Security (RLS)

- **Admin** : Accès complet via policy `Admin full access`
- **Closer** : Accès à ses leads assignés + lecture globale
- **Formateur** : Lecture planning + documents
- **Public** : Insertion de leads uniquement

### Authentification

- Supabase Auth avec sessions JWT
- Middleware vérifie chaque requête
- Server Components utilisent `getCurrentUser()` pour vérifier l'auth

### Webhooks

- Vérification signature Stripe
- Validation des données avant traitement
- Logs d'erreurs pour debugging

## Intégrations externes

### Stripe

- **Payment Links** : Générés via API route `/api/stripe/create-link`
- **Webhooks** : Reçus via `/api/stripe/webhook`
- **Metadata** : Stockage `lead_id` et `closer_id` dans les sessions

### Google Calendar

- **OAuth2** : Via service account ou OAuth flow
- **Création événements** : Automatique après paiement
- **Mise à jour** : Si planning modifié

### WhatsApp

- **Lien direct** : `wa.me/<phone>?text=<message>`
- Pas d'API lourde au départ (juste ouverture navigateur)

## Performance

### Optimisations

- **Server Components** : Rendu côté serveur par défaut
- **Client Components** : Uniquement pour interactivité
- **Indexes DB** : Sur colonnes fréquemment filtrées (status, closer_id, dates)
- **Caching** : Via Next.js et Supabase (à configurer)

### Scalabilité

- Supabase gère la scalabilité PostgreSQL
- Edge Functions pour logique métier lourde
- Storage Supabase pour documents (CDN intégré)

## Déploiement

### Environnements

- **Development** : `npm run dev` (localhost:3000)
- **Production** : Vercel/Netlify avec variables d'env configurées

### Variables d'environnement

- `NEXT_PUBLIC_*` : Accessibles côté client
- Autres : Secrets serveur uniquement

## Maintenance

### Migrations

- Fichiers SQL dans `supabase/migrations/`
- Exécution manuelle ou via Supabase CLI

### Logs

- Console logs pour développement
- Supabase Logs pour Edge Functions
- Vercel Logs pour API routes

### Monitoring

- Supabase Dashboard pour DB
- Vercel Analytics pour performance
- Stripe Dashboard pour paiements

## Évolutions futures

### V1.1
- Templates paramétrables (table `settings`)
- Logs structurés
- Retry logic pour webhooks

### V2
- Relances automatiques (cron jobs ou Edge Functions)
- Notifications push
- Dashboard analytics avancé
