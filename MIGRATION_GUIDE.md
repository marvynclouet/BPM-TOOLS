# 📋 Guide d'exécution de la migration

## ⚠️ Erreur : "relation public.users does not exist"

Cette erreur signifie que les tables de la base de données n'ont pas encore été créées. Il faut d'abord exécuter la migration SQL.

## Étapes pour exécuter la migration

### 1. Ouvrir le SQL Editor dans Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Dans le menu de gauche, cliquez sur **SQL Editor** (icône </>)

### 2. Créer une nouvelle query

1. Cliquez sur le bouton **"New query"** ou **"+"** en haut à gauche

### 3. Copier la migration complète

1. Ouvrez le fichier `supabase/migrations/001_initial_schema.sql` dans votre éditeur
2. **Sélectionnez TOUT le contenu** (Ctrl+A / Cmd+A)
3. **Copiez** (Ctrl+C / Cmd+C)

### 4. Coller dans Supabase SQL Editor

1. Dans Supabase SQL Editor, **collez** tout le contenu (Ctrl+V / Cmd+V)
2. Vous devriez voir tout le script SQL (CREATE TABLE, CREATE INDEX, etc.)

### 5. Exécuter la migration

1. Cliquez sur le bouton **"Run"** (ou appuyez sur Ctrl+Enter / Cmd+Enter)
2. Attendez quelques secondes
3. Vous devriez voir un message de succès : **"Success. No rows returned"**

### 6. Vérifier que les tables sont créées

Dans Supabase, allez dans **Table Editor** (menu de gauche). Vous devriez voir toutes ces tables :
- ✅ `users`
- ✅ `leads`
- ✅ `deals`
- ✅ `payments`
- ✅ `sales_ledger`
- ✅ `documents`
- ✅ `planning`
- ✅ `settings`

## ⚠️ Important : Ordre des opérations

**NE PAS** essayer d'insérer dans `public.users` avant d'avoir exécuté la migration !

L'ordre correct est :
1. ✅ Exécuter la migration SQL (créer les tables)
2. ✅ Créer un utilisateur dans Supabase Auth
3. ✅ Insérer l'utilisateur dans `public.users`

## Créer un utilisateur admin (APRÈS la migration)

### Étape 1 : Créer l'utilisateur dans Supabase Auth

1. Dans Supabase, allez dans **Authentication** → **Users**
2. Cliquez sur **"Add user"** → **"Create new user"**
3. Remplissez :
   - **Email** : `clouetmarvyn@gmail.com`
   - **Password** : (choisissez un mot de passe)
   - **Auto Confirm User** : ✅ Cochez cette case
4. Cliquez sur **"Create user"**
5. **Copiez l'UUID** de l'utilisateur créé (vous le verrez dans la liste des users)

### Étape 2 : Insérer dans public.users

Dans **SQL Editor**, exécutez cette requête en remplaçant `USER_UUID` par l'UUID copié :

```sql
INSERT INTO public.users (id, email, role, full_name)
VALUES (
  'USER_UUID',  -- Remplacez par l'UUID de l'utilisateur créé dans Auth
  'clouetmarvyn@gmail.com',
  'admin',
  'Marvyn'
);
```

## Vérification finale

Pour vérifier que tout est correct, exécutez dans SQL Editor :

```sql
SELECT * FROM public.users;
```

Vous devriez voir votre utilisateur avec le rôle `admin`.

## 🎉 C'est fait !

Maintenant vous pouvez :
1. Redémarrer votre serveur Next.js
2. Aller sur http://localhost:3000/login
3. Vous connecter avec `clouetmarvyn@gmail.com` et le mot de passe que vous avez choisi
