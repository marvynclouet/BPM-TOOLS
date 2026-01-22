# 🚀 Exécuter la migration - Guide rapide

## Le problème

Vous avez l'erreur : `relation "public.users" does not exist`

**Solution :** Il faut d'abord créer les tables en exécutant la migration SQL.

## Solution en 3 étapes

### Étape 1 : Ouvrir Supabase SQL Editor

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor** dans le menu de gauche (icône `</>`)

### Étape 2 : Copier la migration

1. Ouvrez le fichier : `supabase/migrations/001_initial_schema.sql`
2. **Sélectionnez TOUT** (Ctrl+A / Cmd+A)
3. **Copiez** (Ctrl+C / Cmd+C)

### Étape 3 : Coller et exécuter dans Supabase

1. Dans Supabase SQL Editor, **collez** le contenu (Ctrl+V / Cmd+V)
2. Cliquez sur **"Run"** (ou Ctrl+Enter)
3. Attendez le message : **"Success. No rows returned"**

## ✅ Vérification

Après l'exécution, allez dans **Table Editor** (menu de gauche). Vous devriez voir :
- `users`
- `leads`
- `deals`
- `payments`
- `sales_ledger`
- `documents`
- `planning`
- `settings`

## ⚠️ Ensuite seulement

**APRÈS** avoir exécuté la migration, vous pourrez :
1. Créer un utilisateur dans **Authentication → Users**
2. Insérer cet utilisateur dans `public.users` via SQL

Voir `MIGRATION_GUIDE.md` pour les détails complets.
