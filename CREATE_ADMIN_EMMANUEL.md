# Créer l'utilisateur admin Emmanuel

Ce guide vous explique comment créer l'utilisateur admin **Emmanuel** avec l'email `emmanuel.kabouh@hotmail.com` et le mot de passe `azerty123`.

## Étapes

### 1. Créer l'utilisateur dans Supabase Authentication

1. Allez dans votre projet Supabase
2. Ouvrez **Authentication** → **Users**
3. Cliquez sur **Add user** (ou **Invite user**)
4. Remplissez :
   - **Email**: `emmanuel.kabouh@hotmail.com`
   - **Password**: `azerty123`
   - **Auto Confirm User**: ✅ (cocher pour activer directement)
5. Cliquez sur **Create user**

### 2. Exécuter le script SQL

1. Allez dans **SQL Editor** dans Supabase
2. Créez une nouvelle requête
3. Copiez-collez le contenu du fichier `supabase/scripts/create_admin_emmanuel.sql`
4. Exécutez le script (bouton **Run**)

Le script va :
- Vérifier que l'utilisateur existe dans `auth.users`
- Créer ou mettre à jour l'utilisateur dans `public.users` avec le rôle `admin`
- Afficher un résumé de la création

### 3. Vérifier la création

Après l'exécution du script, vous devriez voir dans les logs :
```
✅ Utilisateur trouvé dans auth.users avec UUID: ...
✅ Utilisateur créé/mis à jour dans public.users avec succès !
📊 Résumé :
   UUID: ...
   Email: emmanuel.kabouh@hotmail.com
   Rôle: admin
   Nom: Emmanuel
```

### 4. Se connecter

L'utilisateur peut maintenant se connecter avec :
- **Email**: `emmanuel.kabouh@hotmail.com`
- **Mot de passe**: `azerty123`

## Alternative : Création via l'interface Supabase

Si vous préférez créer l'utilisateur directement via l'interface :

1. **Authentication** → **Users** → **Add user**
2. Email: `emmanuel.kabouh@hotmail.com`
3. Password: `azerty123`
4. Auto Confirm: ✅
5. Créer l'utilisateur
6. Copier l'UUID de l'utilisateur créé
7. Exécuter ce SQL (remplacez `USER_UUID` par l'UUID copié) :

```sql
INSERT INTO public.users (id, email, role, full_name)
VALUES ('USER_UUID', 'emmanuel.kabouh@hotmail.com', 'admin', 'Emmanuel')
ON CONFLICT (id) DO UPDATE
SET role = 'admin', full_name = 'Emmanuel', updated_at = NOW();
```

## Dépannage

### Erreur : "Utilisateur non trouvé dans auth.users"
- Vérifiez que vous avez bien créé l'utilisateur dans Authentication → Users
- Vérifiez que l'email est exactement `emmanuel.kabouh@hotmail.com`

### L'utilisateur ne peut pas se connecter
- Vérifiez que "Auto Confirm User" était coché lors de la création
- Vérifiez que le mot de passe est bien `azerty123`
- Vérifiez dans `public.users` que le rôle est bien `admin`
