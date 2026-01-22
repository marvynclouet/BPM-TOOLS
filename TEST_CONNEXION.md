# 🧪 Test de connexion - Guide de débogage

## Étapes pour tester

### 1. Ouvrir la console du navigateur

1. Appuyez sur **F12** pour ouvrir les outils de développement
2. Allez dans l'onglet **Console**

### 2. Essayer de se connecter

1. Allez sur http://localhost:3000/login
2. Entrez vos identifiants :
   - Email : `clouetmarvyn@gmail.com`
   - Mot de passe : (votre mot de passe)
3. Cliquez sur "Se connecter"

### 3. Observer les logs dans la console

Vous devriez voir dans la console :
- `✅ Connexion réussie, redirection vers /dashboard...`
- `🔄 Redirection en cours...`

### 4. Vérifier les logs du serveur

Dans le terminal où tourne `npm run dev`, vous devriez voir :
- `✅ Utilisateur trouvé: clouetmarvyn@gmail.com Rôle: admin`

## Problèmes possibles

### Si vous voyez "❌ Pas d'utilisateur trouvé"

Cela signifie que `getCurrentUser()` ne trouve pas l'utilisateur dans `public.users`.

**Solution :**
1. Vérifiez dans Supabase SQL Editor :
```sql
SELECT * FROM public.users WHERE email = 'clouetmarvyn@gmail.com';
```

2. Si aucun résultat, exécutez :
```sql
-- Ouvrez supabase/scripts/verify_and_fix_user.sql
-- Copiez-collez et exécutez
```

### Si la page reste sur /login

**Causes possibles :**
1. La redirection ne fonctionne pas
2. Le middleware bloque l'accès
3. La session n'est pas synchronisée

**Solution :**
1. Videz le cache du navigateur (Ctrl+Shift+Delete)
2. Redémarrez le serveur Next.js
3. Essayez en navigation privée

### Si vous voyez une erreur 500

**Causes possibles :**
1. Problème avec les RLS policies
2. Erreur dans la requête SQL

**Solution :**
1. Vérifiez les logs du serveur pour l'erreur exacte
2. Exécutez le script `fix_rls_policies.sql`

## Test rapide

Essayez d'accéder directement à :
- http://localhost:3000/dashboard

**Résultats possibles :**
- ✅ Vous voyez le dashboard → La connexion fonctionne !
- ❌ Redirection vers /login → Vous n'êtes pas connecté
- ❌ Erreur → Regardez le message d'erreur

## Vérification manuelle de la session

Dans la console du navigateur (F12), exécutez :

```javascript
// Vérifier la session Supabase
const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
const { data: { user } } = await supabase.auth.getUser()
console.log('User:', user)
```

Si `user` est `null`, vous n'êtes pas connecté.
