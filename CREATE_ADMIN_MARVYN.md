# 👤 Créer le compte admin "Marvyn"

## Méthode 1 : Via l'interface Supabase (Recommandé)

### Étape 1 : Créer l'utilisateur dans Supabase Auth

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Dans le menu de gauche, cliquez sur **Authentication** → **Users**
4. Cliquez sur **"Add user"** → **"Create new user"**
5. Remplissez :
   - **Email** : `clouetmarvyn@gmail.com`
   - **Password** : (choisissez un mot de passe sécurisé)
   - **Auto Confirm User** : ✅ **Cochez cette case** (important !)
6. Cliquez sur **"Create user"**
7. **Copiez l'UUID** de l'utilisateur créé (visible dans la colonne "UUID" ou dans les détails)

### Étape 2 : Ajouter dans public.users

1. Allez dans **SQL Editor** (icône `</>` dans le menu)
2. Cliquez sur **"New query"**
3. Copiez-collez ce script en remplaçant `USER_UUID_ICI` par l'UUID copié :

```sql
INSERT INTO public.users (id, email, role, full_name)
VALUES (
  'USER_UUID_ICI',  -- Remplacez par l'UUID de l'utilisateur créé
  'clouetmarvyn@gmail.com',
  'admin',
  'Marvyn'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();
```

4. Cliquez sur **"Run"**

## Méthode 2 : Script automatique (Recommandé si l'utilisateur existe déjà)

Si l'utilisateur `clouetmarvyn@gmail.com` existe déjà dans **Authentication → Users** :

1. Allez dans **SQL Editor**
2. Ouvrez le fichier `supabase/scripts/create_admin_marvyn_auto.sql`
3. **Copiez-collez TOUT le contenu** dans SQL Editor
4. Cliquez sur **"Run"**

Le script :
- ✅ Cherche automatiquement l'utilisateur dans `auth.users`
- ✅ L'ajoute dans `public.users` avec le rôle `admin`
- ✅ Affiche un message de confirmation
- ✅ Affiche les détails de l'utilisateur créé

**C'est la méthode la plus simple !** 🚀

## Vérification

Pour vérifier que le compte admin est créé :

```sql
SELECT id, email, role, full_name FROM public.users WHERE email = 'clouetmarvyn@gmail.com';
```

Vous devriez voir :
- `email` : `clouetmarvyn@gmail.com`
- `role` : `admin`
- `full_name` : `Marvyn`

## 🎉 Connexion

Maintenant vous pouvez :
1. Redémarrer votre serveur Next.js si nécessaire
2. Aller sur http://localhost:3000/login
3. Vous connecter avec :
   - **Email** : `clouetmarvyn@gmail.com`
   - **Password** : (le mot de passe que vous avez choisi)

## ⚠️ Problèmes courants

### Erreur : "relation public.users does not exist"
→ Vous devez d'abord exécuter la migration ! Voir `MIGRATION_GUIDE.md`

### Erreur : "duplicate key value violates unique constraint"
→ L'utilisateur existe déjà. Le script avec `ON CONFLICT` devrait le mettre à jour.

### Erreur : "violates foreign key constraint"
→ L'UUID n'existe pas dans `auth.users`. Créez d'abord l'utilisateur dans Authentication → Users.

### Impossible de se connecter
→ Vérifiez que :
- L'utilisateur existe dans `auth.users` ET dans `public.users`
- Le rôle est bien `admin` dans `public.users`
- Le mot de passe est correct
