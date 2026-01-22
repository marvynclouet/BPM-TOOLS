# 🐛 Débogage : Problème de connexion (chargement infini)

## Symptômes

- La page de login charge à l'infini après avoir entré les identifiants
- Pas d'erreur visible
- Boucle de redirection possible

## Causes possibles

### 1. L'utilisateur n'existe pas dans `public.users` ❗ (Le plus probable)

**Solution :**
1. Vérifiez dans Supabase SQL Editor :
```sql
SELECT * FROM public.users WHERE email = 'clouetmarvyn@gmail.com';
```

2. Si aucun résultat, exécutez le script :
   - Ouvrez `supabase/scripts/create_admin_marvyn_auto.sql`
   - Copiez-collez dans SQL Editor
   - Cliquez sur "Run"

### 2. Problème de RLS (Row Level Security)

**Solution :**
Exécutez le script de correction des RLS policies :
```sql
-- Dans Supabase SQL Editor
-- Ouvrez supabase/scripts/fix_rls_policies.sql et exécutez-le
```

### 3. Session Supabase non synchronisée

**Solution :**
1. Déconnectez-vous complètement (videz les cookies du navigateur)
2. Redémarrez le serveur Next.js
3. Essayez de vous reconnecter

### 4. Erreur dans la console du navigateur

**Vérification :**
1. Ouvrez les outils de développement (F12)
2. Onglet "Console" : cherchez les erreurs
3. Onglet "Network" : vérifiez les requêtes qui échouent

## Vérifications étape par étape

### Étape 1 : Vérifier que l'utilisateur existe dans auth.users

Dans Supabase SQL Editor :
```sql
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'clouetmarvyn@gmail.com';
```

**Résultat attendu :** Un utilisateur avec un UUID

### Étape 2 : Vérifier que l'utilisateur existe dans public.users

```sql
SELECT id, email, role, full_name 
FROM public.users 
WHERE email = 'clouetmarvyn@gmail.com';
```

**Résultat attendu :** Un utilisateur avec `role = 'admin'`

### Étape 3 : Vérifier les RLS policies

```sql
-- Vérifier les policies sur public.users
SELECT * FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public';
```

**Résultat attendu :** Au moins une policy qui permet la lecture

### Étape 4 : Tester la connexion avec les logs

1. Ouvrez la console du navigateur (F12)
2. Essayez de vous connecter
3. Regardez les messages d'erreur dans la console

## Solution rapide (si tout le reste échoue)

### Option 1 : Désactiver temporairement RLS (DÉVELOPPEMENT SEULEMENT)

```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

⚠️ **ATTENTION** : Ne faites ça qu'en développement ! Réactivez RLS après.

### Option 2 : Créer manuellement l'utilisateur

1. Trouvez l'UUID dans auth.users :
```sql
SELECT id FROM auth.users WHERE email = 'clouetmarvyn@gmail.com';
```

2. Insérez dans public.users :
```sql
INSERT INTO public.users (id, email, role, full_name)
VALUES (
  'UUID_COPIE_CI_DESSUS',
  'clouetmarvyn@gmail.com',
  'admin',
  'Marvyn'
);
```

## Logs utiles

Les logs améliorés dans `src/lib/auth.ts` afficheront maintenant :
- Si l'utilisateur n'existe pas dans public.users
- Les erreurs RLS
- Les erreurs de connexion

Consultez la console du serveur Next.js pour voir ces logs.
