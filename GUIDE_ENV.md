# Guide : Comment trouver les valeurs Supabase

## ⚠️ Problème détecté

Les valeurs dans votre fichier `.env` ne correspondent pas aux bonnes variables. Voici comment les corriger :

## 📍 Où trouver les bonnes valeurs

### 1. Connectez-vous à Supabase
- Allez sur https://supabase.com/dashboard
- Connectez-vous avec votre compte

### 2. Sélectionnez votre projet
- Cliquez sur votre projet dans la liste

### 3. Accédez aux paramètres API
- Dans le menu de gauche, cliquez sur **Settings** (⚙️)
- Puis cliquez sur **API**

### 4. Copiez les valeurs

Vous verrez une section **Project API keys** avec :

#### a) Project URL
- **Variable à utiliser** : `NEXT_PUBLIC_SUPABASE_URL`
- **Format** : `https://xxxxx.supabase.co`
- **Exemple** : `https://abcdefghijklmnop.supabase.co`
- ⚠️ Ce n'est PAS une clé, c'est une URL !

#### b) anon / public key
- **Variable à utiliser** : `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Format** : Commence par `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- C'est une longue chaîne JWT
- ⚠️ C'est la clé "anon" ou "public", PAS "publishable" ou "secret"

#### c) service_role key
- **Variable à utiliser** : `SUPABASE_SERVICE_ROLE_KEY`
- **Format** : Commence par `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- C'est aussi une longue chaîne JWT
- ⚠️ Cette clé est SECRÈTE, ne la partagez JAMAIS !
- ⚠️ Ce n'est PAS l'URL PostgreSQL !

## 📝 Exemple de fichier .env correct

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE5MzE4MTUwMjJ9.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## ❌ Erreurs courantes à éviter

1. **Ne pas utiliser** les clés qui commencent par `sb_publishable_` ou `sb_secret_` (ce sont des clés pour d'autres services)
2. **Ne pas utiliser** l'URL de connexion PostgreSQL (`postgresql://...`) pour `SUPABASE_SERVICE_ROLE_KEY`
3. **Utiliser** uniquement les clés JWT qui commencent par `eyJ...`

## ✅ Vérification

Après avoir rempli le fichier `.env` :
1. Redémarrez le serveur : `npm run dev`
2. Si tout est correct, vous ne verrez plus l'erreur "Your project's URL and Key are required"
3. Vous serez redirigé vers `/setup` ou `/login` selon votre configuration

## 🔗 Liens utiles

- Dashboard Supabase : https://supabase.com/dashboard
- Documentation API : https://supabase.com/docs/reference/javascript/introduction
