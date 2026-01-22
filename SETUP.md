# Guide de setup BPM Tools

## Prérequis

- Node.js 18+ et npm
- Compte Supabase
- Compte Stripe
- Compte Google (pour Calendar API, optionnel au départ)

## Étapes de configuration

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration Supabase

1. **Créer un projet Supabase**
   - Aller sur https://supabase.com
   - Créer un nouveau projet
   - Noter l'URL et les clés API

2. **Exécuter les migrations**
   - Dans le dashboard Supabase, aller dans "SQL Editor"
   - Copier-coller le contenu de `supabase/migrations/001_initial_schema.sql`
   - Exécuter la migration

3. **Configurer le Storage**
   - Aller dans "Storage"
   - Créer un bucket nommé `documents`
   - Configurer les policies RLS selon vos besoins

4. **Créer le premier utilisateur admin**
   - Aller dans "Authentication" → "Users"
   - Créer un utilisateur manuellement ou via l'interface
   - Dans "SQL Editor", exécuter :
   ```sql
   INSERT INTO public.users (id, email, role, full_name)
   VALUES (
     'user-uuid-from-auth',
     'admin@example.com',
     'admin',
     'Admin User'
   );
   ```

### 3. Configuration Stripe

1. **Créer un compte Stripe**
   - Aller sur https://stripe.com
   - Récupérer les clés API (Test mode pour commencer)

2. **Configurer le webhook**
   - Dans Stripe Dashboard → Developers → Webhooks
   - Ajouter endpoint : `https://votre-domaine.com/api/stripe/webhook`
   - Sélectionner les événements :
     - `checkout.session.completed`
     - `payment_intent.succeeded`
   - Copier le "Signing secret"

### 4. Configuration Google Calendar (optionnel pour MVP)

1. **Créer un projet Google Cloud**
   - Aller sur https://console.cloud.google.com
   - Créer un projet
   - Activer l'API Google Calendar

2. **Créer des credentials OAuth2**
   - Créer un "OAuth 2.0 Client ID"
   - Configurer les redirect URIs
   - Télécharger les credentials

3. **Obtenir un refresh token**
   - Suivre le flow OAuth2 pour obtenir un refresh token
   - Stocker le refresh token dans les variables d'env

### 5. Variables d'environnement

Créer un fichier `.env.local` (ou `.env`) à la racine :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google Calendar (optionnel)
GOOGLE_CALENDAR_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=xxxxx
GOOGLE_CALENDAR_REFRESH_TOKEN=xxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Configuration initiale des paramètres

Dans Supabase SQL Editor, insérer les paramètres par défaut :

```sql
-- Prix des formations
INSERT INTO public.settings (key, value) VALUES
('prices', '{"inge_son": 500, "beatmaking": 400, "autre": 300}'::jsonb);

-- Commissions
INSERT INTO public.settings (key, value) VALUES
('commissions', '{"closer_rate": 0.1, "formateur_rate": 0.05}'::jsonb);

-- Templates messages (optionnel)
INSERT INTO public.settings (key, value) VALUES
('whatsapp_template', '{"message": "Bonjour {first_name}, voici le lien de paiement: {payment_link}"}'::jsonb);
```

### 7. Lancer le projet

```bash
npm run dev
```

Le projet sera accessible sur http://localhost:3000

## Tests de base

1. **Test du formulaire public**
   - Aller sur http://localhost:3000/form?source=test
   - Remplir le formulaire
   - Vérifier dans Supabase que le lead est créé avec statut "nouveau"

2. **Test de connexion**
   - Aller sur http://localhost:3000/login
   - Se connecter avec le compte admin créé
   - Vérifier l'accès au dashboard

3. **Test du CRM**
   - Dans le dashboard, aller dans "CRM"
   - Vérifier que les leads s'affichent
   - Tester les actions (marquer appelé, etc.)

## Prochaines étapes

- [ ] Implémenter la génération PDF réelle
- [ ] Configurer l'envoi d'emails
- [ ] Tester le webhook Stripe (utiliser Stripe CLI pour tests locaux)
- [ ] Configurer Google Calendar
- [ ] Personnaliser les templates de messages

## Dépannage

### Erreur "Unauthorized" au login
- Vérifier que l'utilisateur existe dans `auth.users` ET `public.users`
- Vérifier que le rôle est bien défini dans `public.users`

### Erreur RLS
- Vérifier les policies RLS dans Supabase
- Tester avec un compte admin qui devrait avoir accès complet

### Webhook Stripe ne fonctionne pas
- Utiliser Stripe CLI pour tester localement : `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Vérifier la signature dans les logs
