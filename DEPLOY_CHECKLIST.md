# ✅ Checklist de déploiement Vercel

## Avant le déploiement

### 1. Variables d'environnement dans Vercel

Allez dans **Vercel Dashboard** → Votre projet → **Settings** → **Environment Variables**

Ajoutez ces variables (Production, Preview, Development) :

#### ⚠️ OBLIGATOIRES :
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = votre URL Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = votre clé anon Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = votre clé service_role Supabase
- [ ] `NEXT_PUBLIC_APP_URL` = `https://votre-projet.vercel.app` (ou votre domaine custom)

#### 📧 Recommandées :
- [ ] `RESEND_API_KEY` = votre clé Resend
- [ ] `RESEND_FROM_EMAIL` = `BPM Formation <noreply@bpmformation.fr>`

#### 💳 Optionnelles (si utilisées) :
- [ ] `STRIPE_SECRET_KEY`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_META_PIXEL_ID`
- [ ] `GOOGLE_CALENDAR_CLIENT_ID`
- [ ] `GOOGLE_CALENDAR_CLIENT_SECRET`
- [ ] `GOOGLE_CALENDAR_REFRESH_TOKEN`

### 2. Vérifications locales

- [ ] Le build fonctionne localement : `npm run build`
- [ ] Pas d'erreurs TypeScript : `npm run type-check`
- [ ] Pas d'erreurs ESLint : `npm run lint`
- [ ] Les fichiers logo sont dans `public/` :
  - [ ] `public/logo-bpm-formations.webp`
  - [ ] `public/logo-bpm-tools.png`

### 3. Supabase

- [ ] Toutes les migrations sont exécutées
- [ ] Les RLS policies sont configurées
- [ ] Les buckets Storage sont créés (si nécessaire)

## Après le déploiement

### Tests à effectuer

- [ ] Page d'accueil se charge : `https://votre-projet.vercel.app`
- [ ] Formulaire public fonctionne : `https://votre-projet.vercel.app/form`
- [ ] Connexion fonctionne : `https://votre-projet.vercel.app/login`
- [ ] Dashboard accessible après connexion
- [ ] Images se chargent (logo dans la navbar)
- [ ] CRM fonctionne (liste des leads)
- [ ] Génération PDF fonctionne (test depuis Gestion ou Comptabilité)
- [ ] Envoi d'emails fonctionne (si Resend configuré)

## 🔧 Si le build échoue

1. **Vérifier les logs de build** dans Vercel Dashboard
2. **Vérifier les variables d'environnement** (noms exacts, valeurs complètes)
3. **Tester localement** : `npm run build`
4. **Vérifier les erreurs TypeScript** : `npm run type-check`

## 📝 Notes importantes

- ⚠️ **NEXT_PUBLIC_APP_URL** doit être configuré avec l'URL Vercel pour que les PDFs fonctionnent
- ⚠️ Les fichiers dans `public/` sont automatiquement servis par Vercel
- ⚠️ `sharp` est automatiquement géré par Vercel pour Next.js
- ⚠️ Après avoir ajouté des variables d'environnement, **redéployez** le projet
