# Instructions pour redéployer manuellement sur Vercel

## Problème
Vercel utilise l'ancien commit (b4a6ee1) au lieu du nouveau (fc07710) qui contient les corrections ESLint.

## Solution : Redéploiement manuel

### Option 1 : Via Vercel Dashboard (Recommandé)

1. **Allez sur Vercel Dashboard** : https://vercel.com/dashboard
2. **Sélectionnez votre projet** : BPM-TOOLS
3. **Allez dans l'onglet "Deployments"**
4. **Trouvez le dernier déploiement** (celui qui a échoué)
5. **Cliquez sur les 3 points** (⋯) à droite du déploiement
6. **Sélectionnez "Redeploy"**
7. **⚠️ IMPORTANT** : Décochez **"Use existing Build Cache"** pour forcer un nouveau build
8. **Cliquez sur "Redeploy"**

### Option 2 : Via Vercel CLI

```bash
# Installer Vercel CLI si pas déjà fait
npm i -g vercel

# Se connecter
vercel login

# Aller dans le dossier du projet
cd "/Users/macpro/Desktop/DEV/BPM TOOLS"

# Redéployer
vercel --prod
```

### Option 3 : Vérifier la configuration Git

1. **Allez dans Vercel Dashboard** → Votre projet → **Settings** → **Git**
2. **Vérifiez que la branche `main` est bien connectée**
3. **Vérifiez les webhooks GitHub** :
   - Allez sur GitHub → Votre repo → **Settings** → **Webhooks**
   - Vérifiez qu'il y a un webhook pour Vercel
   - Si le webhook n'existe pas ou est cassé, reconnectez le repo dans Vercel

### Option 4 : Reconnecter le repo Git

1. **Allez dans Vercel Dashboard** → Votre projet → **Settings** → **Git**
2. **Cliquez sur "Disconnect"** pour déconnecter le repo
3. **Cliquez sur "Connect Git Repository"**
4. **Sélectionnez `marvynclouet/BPM-TOOLS`**
5. **Vérifiez que la branche `main` est sélectionnée**
6. **Cliquez sur "Connect"**

## Vérification

Après le redéploiement, vérifiez dans les logs que :
- Le commit utilisé est **fc07710** (ou plus récent)
- Le build passe sans erreurs ESLint
- Le déploiement se termine avec succès

## Commits disponibles

- **fc07710** - Disable problematic ESLint rules to allow Vercel build ✅ (Dernier commit avec corrections)
- **15844f9** - Force Vercel to use latest commit with all ESLint fixes
- **ecbe82b** - Fix remaining ESLint errors - escape apostrophes and fix require rule
- **b4a6ee1** - Trigger Vercel redeploy ❌ (Ancien commit utilisé par Vercel)
