# ✅ Correction : Utiliser les nouvelles clés Supabase

## ✅ Bonne nouvelle !

Vous avez les **BONNES** clés ! Supabase a changé son système de clés API.

## 📝 Mise à jour de .env.local

Votre fichier `.env.local` doit contenir :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tcvryjuldxbjmgiujmog.supabase.co

# Nouvelle clé "Publishable" (remplace l'ancienne anon key)
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_FyYFafsqX8VM-2YZ2RHGaQ_JcGY-dT2

# Nouvelle clé "Secret" (remplace l'ancienne service_role key)
# ⚠️ IMPORTANT : Vous devez révéler la clé complète (pas seulement sb_secret_681OX)
# Cliquez sur l'icône "œil" dans Supabase pour voir la clé complète
SUPABASE_SERVICE_ROLE_KEY=sb_secret_681OXjUOX5kbJQGgC4EZgA_XOty7O4W
```

## ⚠️ Action requise

Dans Supabase Dashboard → Settings → API → Secret keys :
1. Cliquez sur l'icône **"œil"** 👁️ à côté de votre secret key
2. **Copiez la clé COMPLÈTE** (pas seulement `sb_secret_681OX`)
3. Collez-la dans `.env.local` pour `SUPABASE_SERVICE_ROLE_KEY`

## ✅ Après correction

1. **Redémarrez le serveur** :
   ```bash
   # Ctrl+C puis
   npm run dev
   ```

2. **Testez** :
   - Allez sur http://localhost:3000/test-login
   - Cliquez sur "Aller au dashboard"
   - Ça devrait fonctionner maintenant !

## 📚 Note

Supabase a migré vers de nouvelles clés API :
- **Anciennes** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT)
- **Nouvelles** : `sb_publishable_...` et `sb_secret_...`

Les deux fonctionnent, mais les nouvelles sont recommandées. Le code a été adapté pour supporter les deux formats.
