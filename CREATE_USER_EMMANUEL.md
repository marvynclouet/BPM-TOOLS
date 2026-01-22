# Créer l'utilisateur admin Emmanuel

## Méthode 1 : Script Node.js (Recommandé - Automatique)

### Prérequis
- Node.js installé
- Variables d'environnement configurées dans `.env.local`

### Étapes

1. **Installer dotenv (si pas déjà installé)**
   ```bash
   npm install dotenv --save-dev
   ```

2. **Exécuter le script**
   ```bash
   node scripts/create-user-emmanuel.js
   ```

Le script va automatiquement :
- ✅ Créer l'utilisateur dans `auth.users` avec l'email `emmanuel.kabouh@hotmail.com` et le mot de passe `azerty123`
- ✅ Créer/mettre à jour l'utilisateur dans `public.users` avec le rôle `admin`
- ✅ Afficher un résumé de la création

## Méthode 2 : Via l'interface Supabase (Manuel)

### Étape 1 : Créer l'utilisateur dans Authentication

1. Allez dans votre projet Supabase
2. Ouvrez **Authentication** → **Users**
3. Cliquez sur **Add user** → **Create new user**
4. Remplissez :
   - **Email** : `emmanuel.kabouh@hotmail.com`
   - **Password** : `azerty123`
   - **Auto Confirm User** : ✅ (cocher)
5. Cliquez sur **Create user**
6. **Copiez l'UUID** de l'utilisateur créé (visible dans la liste des users)

### Étape 2 : Ajouter dans public.users

1. Allez dans **SQL Editor** dans Supabase
2. Exécutez cette requête (remplacez `USER_UUID` par l'UUID copié) :

```sql
INSERT INTO public.users (id, email, role, full_name)
VALUES (
  'USER_UUID',  -- Remplacez par l'UUID de l'utilisateur
  'emmanuel.kabouh@hotmail.com',
  'admin',
  'Emmanuel'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();
```

## Vérification

Après la création, l'utilisateur peut se connecter avec :
- **Email** : `emmanuel.kabouh@hotmail.com`
- **Mot de passe** : `azerty123`

## Dépannage

### Erreur : "NEXT_PUBLIC_SUPABASE_URL non défini"
- Vérifiez que `.env.local` existe et contient `NEXT_PUBLIC_SUPABASE_URL`
- Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est défini

### Erreur : "Utilisateur déjà existant"
- C'est normal si l'utilisateur existe déjà dans `auth.users`
- Le script mettra à jour l'utilisateur dans `public.users` automatiquement

### L'utilisateur ne peut pas se connecter
- Vérifiez que "Auto Confirm User" était coché lors de la création
- Vérifiez que le mot de passe est bien `azerty123`
- Vérifiez dans `public.users` que le rôle est bien `admin`
