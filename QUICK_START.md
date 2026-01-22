# 🚀 Démarrage rapide - BPM Tools

## Étape 1 : Configurer Supabase

1. **Créer un compte/Se connecter** sur https://supabase.com

2. **Créer un nouveau projet** (ou utiliser un existant)

3. **Récupérer les clés API** :
   - Dans votre projet Supabase, allez dans **Settings** → **API**
   - Vous verrez :
     - **Project URL** : `https://xxxxx.supabase.co`
     - **anon/public key** : Une longue clé JWT commençant par `eyJ...`
     - **service_role key** : Une autre longue clé JWT (gardez-la secrète !)

## Étape 2 : Remplir le fichier .env.local

1. Ouvrez le fichier `.env.local` à la racine du projet

2. Remplissez les 3 valeurs Supabase obligatoires :

```env
# Remplacer par votre Project URL
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co

# Remplacer par votre anon/public key
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Remplacer par votre service_role key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Les autres variables peuvent rester vides pour l'instant
```

## Étape 3 : Configurer la base de données ⚠️ IMPORTANT

**⚠️ Cette étape est OBLIGATOIRE avant de créer un utilisateur !**

1. Dans Supabase, allez dans **SQL Editor** (icône </> dans le menu)

2. Cliquez sur **"New query"** ou **"+"**

3. Ouvrez le fichier `supabase/migrations/001_initial_schema.sql` dans votre éditeur

4. **Sélectionnez TOUT le contenu** (Ctrl+A / Cmd+A) et **copiez-le** (Ctrl+C / Cmd+C)

5. **Collez** tout le contenu dans le SQL Editor de Supabase

6. Cliquez sur **"Run"** (ou Ctrl+Enter / Cmd+Enter)

7. Attendez le message de succès : **"Success. No rows returned"**

8. Vérifiez dans **Table Editor** que les tables sont créées (users, leads, deals, etc.)

**📖 Guide détaillé :** Consultez `MIGRATION_GUIDE.md` pour plus de détails

## Étape 4 : Créer un utilisateur admin

**⚠️ IMPORTANT :** Faites cette étape APRÈS avoir exécuté la migration (Étape 3) !

### 4.1 Créer l'utilisateur dans Supabase Auth

1. Dans Supabase, allez dans **Authentication** → **Users**
2. Cliquez sur **"Add user"** → **"Create new user"**
3. Remplissez :
   - **Email** : `clouetmarvyn@gmail.com` (ou votre email)
   - **Password** : (choisissez un mot de passe sécurisé)
   - **Auto Confirm User** : ✅ Cochez cette case
4. Cliquez sur **"Create user"**
5. **Copiez l'UUID** de l'utilisateur (visible dans la liste des users)

### 4.2 Ajouter l'utilisateur dans public.users

Dans **SQL Editor**, exécutez (remplacez `USER_UUID` par l'UUID copié) :

```sql
INSERT INTO public.users (id, email, role, full_name)
VALUES (
  'USER_UUID',  -- Remplacez par l'UUID de l'utilisateur créé dans Auth
  'clouetmarvyn@gmail.com',
  'admin',
  'Marvyn'
);
```

## Étape 5 : Redémarrer le serveur

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez :
npm run dev
```

## Étape 6 : Vérifier

1. Ouvrez http://localhost:3000
2. Vous devriez être redirigé vers `/setup` ou `/login`
3. Si tout est vert sur `/setup`, c'est bon ! 🎉
4. Connectez-vous avec votre compte admin

## ⚠️ Problèmes courants

### Les variables ne sont pas détectées
- ✅ Vérifiez que le fichier s'appelle bien `.env.local` (pas `.env`)
- ✅ Redémarrez le serveur après modification du fichier
- ✅ Vérifiez qu'il n'y a pas d'espaces autour du `=`

### Erreur "Invalid API key"
- ✅ Vérifiez que vous avez copié la **anon key** (pas la service_role) dans `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ Vérifiez que l'URL commence bien par `https://`

### Erreur de connexion
- ✅ Vérifiez que l'utilisateur existe dans `auth.users` ET dans `public.users`
- ✅ Vérifiez que le rôle est bien défini dans `public.users`

## 📚 Documentation complète

- `SETUP.md` : Guide complet de configuration
- `GUIDE_ENV.md` : Guide détaillé pour trouver les valeurs Supabase
- `README.md` : Documentation générale du projet
