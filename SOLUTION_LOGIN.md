# 🔧 Solution : Problème de connexion (reste sur page login)

## Diagnostic

Si après la connexion vous restez sur la page login, c'est que :
1. ✅ L'authentification Supabase fonctionne (pas d'erreur de mot de passe)
2. ❌ Mais l'utilisateur n'existe pas dans `public.users`

## Solution en 3 étapes

### Étape 1 : Vérifier le statut de l'utilisateur

Dans Supabase SQL Editor, exécutez le script de diagnostic :

```sql
-- Ouvrez supabase/scripts/check_user_status.sql
-- Copiez-collez et exécutez
```

Ce script vous dira exactement où se trouve le problème.

### Étape 2 : Créer l'utilisateur dans public.users

Si l'utilisateur n'existe pas dans `public.users`, exécutez :

```sql
-- Ouvrez supabase/scripts/create_admin_marvyn_auto.sql
-- Copiez-collez et exécutez
```

### Étape 3 : Corriger les RLS policies

Exécutez le script de correction des RLS :

```sql
-- Ouvrez supabase/scripts/fix_rls_policies.sql
-- Copiez-collez et exécutez
```

## Vérification rapide

Dans Supabase SQL Editor, exécutez :

```sql
SELECT 
  au.email as auth_email,
  pu.email as public_email,
  pu.role,
  CASE 
    WHEN pu.id IS NOT NULL THEN '✅ OK'
    ELSE '❌ Utilisateur manquant dans public.users'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'clouetmarvyn@gmail.com';
```

**Résultat attendu :**
- `auth_email` : `clouetmarvyn@gmail.com`
- `public_email` : `clouetmarvyn@gmail.com`
- `role` : `admin`
- `status` : `✅ OK`

## Après avoir exécuté les scripts

1. **Rafraîchissez la page** dans votre navigateur (F5)
2. **Essayez de vous reconnecter**
3. Vous devriez être redirigé vers `/dashboard`

## Si ça ne fonctionne toujours pas

1. **Videz le cache du navigateur** :
   - Chrome/Edge : Ctrl+Shift+Delete
   - Safari : Cmd+Option+E
   - Firefox : Ctrl+Shift+Delete

2. **Vérifiez la console du navigateur** (F12) :
   - Onglet "Console" : cherchez les erreurs
   - Onglet "Network" : vérifiez les requêtes qui échouent

3. **Vérifiez les logs du serveur Next.js** :
   - Regardez le terminal où tourne `npm run dev`
   - Cherchez les messages d'erreur

## Message d'erreur amélioré

J'ai ajouté un message d'erreur clair sur la page de login qui s'affichera si :
- Vous êtes authentifié dans Supabase Auth
- Mais vous n'existe pas dans `public.users`

Ce message vous indiquera exactement quoi faire.
