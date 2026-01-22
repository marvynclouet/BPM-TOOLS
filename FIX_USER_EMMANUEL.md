# 🔧 Fix : Problème de connexion pour emmanuel.kabouh@hotmail.com

## Problème
L'utilisateur existe dans `auth.users` (UID: `4341aab8-719d-452c-aeaa-a5ad05d026c4`) mais ne peut pas se connecter.

## Solution en 3 étapes

### Étape 1 : Vérifier l'utilisateur dans auth.users

Dans Supabase SQL Editor, exécutez :

```sql
SELECT 
  id, 
  email, 
  created_at,
  confirmed_at,
  email_confirmed_at
FROM auth.users 
WHERE id = '4341aab8-719d-452c-aeaa-a5ad05d026c4';
```

**Vérifiez que :**
- `confirmed_at` n'est pas NULL (l'utilisateur doit être confirmé)
- `email_confirmed_at` n'est pas NULL

**Si l'utilisateur n'est pas confirmé :**

Dans Supabase Dashboard :
1. Allez dans **Authentication → Users**
2. Trouvez `emmanuel.kabouh@hotmail.com`
3. Cliquez sur les 3 points (⋮) → **Confirm user**

### Étape 2 : Créer l'utilisateur dans public.users

Exécutez le script SQL suivant dans Supabase SQL Editor :

```sql
-- Créer ou mettre à jour l'utilisateur dans public.users
INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
VALUES (
  '4341aab8-719d-452c-aeaa-a5ad05d026c4',
  'emmanuel.kabouh@hotmail.com',
  'admin',
  'Emmanuel',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();
```

### Étape 3 : Vérifier que tout est OK

Exécutez cette requête de vérification :

```sql
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  au.confirmed_at as auth_confirmed,
  pu.id as public_id,
  pu.email as public_email,
  pu.role as public_role,
  CASE 
    WHEN pu.id IS NOT NULL AND au.confirmed_at IS NOT NULL THEN '✅ OK - Prêt à se connecter'
    WHEN pu.id IS NULL THEN '❌ Utilisateur manquant dans public.users'
    WHEN au.confirmed_at IS NULL THEN '❌ Utilisateur non confirmé dans auth.users'
    ELSE '❌ Problème inconnu'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.id = '4341aab8-719d-452c-aeaa-a5ad05d026c4';
```

**Résultat attendu :**
- `auth_id` : `4341aab8-719d-452c-aeaa-a5ad05d026c4`
- `auth_email` : `emmanuel.kabouh@hotmail.com`
- `auth_confirmed` : Une date (pas NULL)
- `public_id` : `4341aab8-719d-452c-aeaa-a5ad05d026c4`
- `public_email` : `emmanuel.kabouh@hotmail.com`
- `public_role` : `admin`
- `status` : `✅ OK - Prêt à se connecter`

## Réinitialiser le mot de passe (si nécessaire)

Si le mot de passe ne fonctionne pas :

1. Dans Supabase Dashboard → **Authentication → Users**
2. Trouvez `emmanuel.kabouh@hotmail.com`
3. Cliquez sur les 3 points (⋮) → **Reset password**
4. Un email sera envoyé pour réinitialiser le mot de passe

**OU** réinitialisez directement dans SQL :

```sql
-- ⚠️ ATTENTION : Ceci réinitialise le mot de passe à "azerty123"
-- Utilisez uniquement si vous êtes sûr
UPDATE auth.users
SET encrypted_password = crypt('azerty123', gen_salt('bf'))
WHERE id = '4341aab8-719d-452c-aeaa-a5ad05d026c4';
```

## Après avoir exécuté les scripts

1. **Videz le cache du navigateur** (Ctrl+Shift+Delete ou Cmd+Shift+Delete)
2. **Fermez complètement le navigateur**
3. **Rouvrez le navigateur** et allez sur la page de login
4. **Essayez de vous connecter** avec :
   - Email : `emmanuel.kabouh@hotmail.com`
   - Mot de passe : `azerty123` (ou le mot de passe que vous avez défini)

## Si ça ne fonctionne toujours pas

1. **Vérifiez la console du navigateur** (F12) :
   - Onglet "Console" : cherchez les erreurs
   - Onglet "Network" : vérifiez les requêtes qui échouent

2. **Testez avec la page de test** :
   - Allez sur `http://localhost:3000/test-login`
   - Essayez de vous connecter
   - Regardez les messages de statut

3. **Vérifiez les logs Supabase** :
   - Dashboard → Logs → API Logs
   - Cherchez les erreurs liées à cet utilisateur
