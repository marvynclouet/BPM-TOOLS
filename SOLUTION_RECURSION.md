# 🔧 Solution : Récursion infinie dans RLS policies

## Problème

Erreur : `infinite recursion detected in policy for relation "users"`

**Cause :** La policy "Admin full access users" vérifie si l'utilisateur est admin en lisant depuis `public.users`, mais pour lire depuis `public.users`, il faut que la policy soit satisfaite → **récursion infinie**.

## Solution immédiate

### Exécutez ce script dans Supabase SQL Editor

```sql
-- Ouvrez supabase/scripts/fix_rls_recursion.sql
-- Copiez-collez TOUT le contenu et exécutez
```

Ce script :
1. ✅ Supprime les policies problématiques
2. ✅ Crée des policies simples sans récursion
3. ✅ Permet aux utilisateurs authentifiés de lire leur propre profil
4. ✅ Permet la lecture de tous les utilisateurs pour les utilisateurs authentifiés

## Après exécution

1. **Rafraîchissez la page** `/test-login` (F5)
2. **Cliquez sur "Vérifier l'auth"**
3. Vous devriez voir : `✅ OK - Utilisateur trouvé dans public.users avec rôle: admin`

## Explication

Les nouvelles policies :
- **"Users can read own profile"** : Permet à un utilisateur de lire son propre profil (pas de récursion)
- **"Authenticated users can read all"** : Permet à tous les utilisateurs authentifiés de lire tous les profils (pour éviter la récursion)
- **"Users can update own profile"** : Permet à un utilisateur de modifier son propre profil

La vérification du rôle admin se fait dans l'application (dans `getCurrentUser()`), pas dans les RLS policies.

## Sécurité

⚠️ **Note :** Ces policies permettent à tous les utilisateurs authentifiés de lire tous les profils. Pour plus de sécurité en production, vous pouvez :
- Utiliser des fonctions PostgreSQL pour vérifier les rôles
- Utiliser le service role key côté serveur pour les opérations sensibles
- Créer des vues avec RLS plus spécifiques

Pour l'instant, c'est suffisant pour que l'application fonctionne.
