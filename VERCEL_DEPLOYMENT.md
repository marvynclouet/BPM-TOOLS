# Guide de déploiement sur Vercel

## ⚠️ Problèmes courants et solutions

### 1. Variables d'environnement manquantes

**Problème** : Le build échoue car les variables d'environnement ne sont pas configurées.

**Solution** : Configurer toutes les variables dans Vercel Dashboard

1. Allez sur **Vercel Dashboard** → Votre projet → **Settings** → **Environment Variables**
2. Ajoutez toutes les variables suivantes :

#### Variables OBLIGATOIRES :
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=https://votre-projet.vercel.app
```

#### Variables OPTIONNELLES (mais recommandées) :
```env
# Resend (pour emails)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=BPM Formation <noreply@bpmformation.fr>

# Stripe (si utilisé)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Meta Pixel (si utilisé)
NEXT_PUBLIC_META_PIXEL_ID=your_meta_pixel_id_here

# Google Calendar (si utilisé)
GOOGLE_CALENDAR_CLIENT_ID=xxxxx
GOOGLE_CALENDAR_CLIENT_SECRET=xxxxx
GOOGLE_CALENDAR_REFRESH_TOKEN=xxxxx

# WhatsApp (si utilisé)
WHATSAPP_ACCESS_TOKEN=xxxxx
WHATSAPP_PHONE_NUMBER_ID=xxxxx
```

**⚠️ IMPORTANT** : 
- Les variables `NEXT_PUBLIC_*` sont accessibles côté client
- Les autres variables sont uniquement côté serveur
- Après avoir ajouté les variables, **redéployez** le projet

### 2. Problème avec Sharp (génération PDF)

**Problème** : Erreur lors du build liée à `sharp` (dépendance native).

**Solution** : Vercel gère automatiquement `sharp` pour Next.js, mais vérifiez :

1. **Vérifier que `sharp` est dans `dependencies`** (pas `devDependencies`)
   ```json
   "dependencies": {
     "sharp": "^0.34.5"
   }
   ```

2. **Si le problème persiste**, ajoutez dans `next.config.js` :
   ```js
   module.exports = {
     reactStrictMode: true,
     images: {
       domains: [],
     },
     // Forcer l'utilisation de sharp
     experimental: {
       outputFileTracingIncludes: {
         '/api/**/*': ['./node_modules/sharp/**/*'],
       },
     },
   }
   ```

### 3. Problème avec les fichiers statiques (images)

**Problème** : Les images ne se chargent pas en production.

**Solution** : Vérifier que les images sont dans le dossier `public/`

- ✅ `public/logo-bpm-tools.png`
- ✅ `public/logo-bpm-formations.webp`

### 4. Erreur de build TypeScript

**Problème** : Erreurs TypeScript qui bloquent le build.

**Solution** : Vérifier les erreurs dans les logs et corriger :

```bash
# Localement, vérifier les erreurs TypeScript
npm run type-check
```

### 5. Problème avec les Edge Functions Supabase

**Problème** : Les Edge Functions ne fonctionnent pas sur Vercel.

**Solution** : Les Edge Functions Supabase doivent être déployées séparément via Supabase CLI, pas via Vercel.

## 📋 Checklist de déploiement

### Avant le déploiement

- [ ] Toutes les variables d'environnement sont configurées dans Vercel
- [ ] `NEXT_PUBLIC_APP_URL` pointe vers l'URL Vercel (ex: `https://bpm-tools.vercel.app`)
- [ ] Les migrations Supabase sont exécutées
- [ ] Les RLS policies sont configurées
- [ ] Le build fonctionne localement : `npm run build`

### Configuration Vercel

1. **Framework Preset** : Next.js (détecté automatiquement)
2. **Build Command** : `npm run build` (par défaut)
3. **Output Directory** : `.next` (par défaut)
4. **Install Command** : `npm install` (par défaut)

### Après le déploiement

- [ ] Tester la page d'accueil
- [ ] Tester le formulaire public (`/form`)
- [ ] Tester la connexion (`/login`)
- [ ] Vérifier que les images se chargent
- [ ] Tester les fonctionnalités principales (CRM, Comptabilité, Planning)

## 🔧 Commandes utiles

### Déployer manuellement

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Déployer en production
vercel --prod
```

### Voir les logs

```bash
# Logs en temps réel
vercel logs

# Logs d'un déploiement spécifique
vercel logs [deployment-url]
```

## 🐛 Dépannage

### Le build échoue avec "Module not found"

**Solution** : Vérifier que toutes les dépendances sont dans `package.json` et non dans `node_modules` seulement.

### Les variables d'environnement ne fonctionnent pas

**Solution** : 
1. Vérifier que les variables sont bien dans Vercel Dashboard
2. Redéployer après avoir ajouté les variables
3. Vérifier que les noms des variables correspondent exactement (sensible à la casse)

### Erreur "Sharp is not installed"

**Solution** : Vercel installe automatiquement `sharp` pour Next.js. Si le problème persiste :

1. Vérifier que `sharp` est dans `dependencies`
2. Supprimer `node_modules` et `package-lock.json`
3. Réinstaller : `npm install`
4. Redéployer

### Les images ne se chargent pas

**Solution** :
1. Vérifier que les images sont dans `public/`
2. Utiliser le composant `next/image` pour les images
3. Vérifier les chemins (relatifs depuis `public/`)

## 📞 Support

Si le problème persiste :
1. Vérifier les logs de build dans Vercel Dashboard
2. Vérifier les logs runtime dans Vercel Dashboard → Deployments → [votre déploiement] → Functions
3. Tester localement avec `npm run build` pour reproduire l'erreur
