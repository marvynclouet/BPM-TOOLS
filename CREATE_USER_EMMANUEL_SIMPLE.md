# Créer l'utilisateur admin Emmanuel - Méthode Simple

## ⚠️ ERREUR SQL : Ne pas exécuter le script JS dans SQL Editor

Si vous avez eu l'erreur :
```
ERROR: 42601: syntax error at or near "//"
```

C'est parce que vous avez essayé d'exécuter le fichier `scripts/create-user-emmanuel.js` (qui est un **script Node.js**) dans Supabase SQL Editor. 

**Le script JS ne doit PAS être exécuté dans SQL Editor** - il doit être exécuté en ligne de commande avec Node.js.

## Méthode recommandée : Via l'interface Supabase

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

### Étape 2 : Exécuter ce SQL dans SQL Editor

Remplacez `USER_UUID` par l'UUID copié à l'étape 1 :

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

## Alternative : Script Node.js (en ligne de commande)

Si vous préférez utiliser le script automatique :

1. **Installer dotenv** (si pas déjà installé) :
   ```bash
   npm install dotenv --save-dev
   ```

2. **Exécuter le script** :
   ```bash
   node scripts/create-user-emmanuel.js
   ```

⚠️ **Ne copiez PAS le contenu du script JS dans SQL Editor** - cela causera une erreur de syntaxe SQL.
