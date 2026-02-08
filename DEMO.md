# Démo BPM Tools (portfolio)

Cette branche permet de déployer une **version démo** de l’app avec des données fictives, pour la montrer en open (portfolio, démos clients).

## Déploiement

### 1. Projet Supabase dédié démo

- Crée un **nouveau projet** sur [supabase.com](https://supabase.com) (ex. « BPM Tools Demo »).
- Récupère l’URL et la **service_role key** dans Settings → API.

### 2. Appliquer les migrations

- Dans le SQL Editor Supabase du projet démo, exécute les scripts du dossier `supabase/migrations` **dans l’ordre** (001, 002, … 015).
- Ou utilise la CLI : `npx supabase db push` en pointant vers ce projet.

### 3. Seed des données démo

À la racine du repo (avec les variables du projet **démo** dans `.env.local`) :

```bash
node scripts/seed-demo.js
```

Cela crée :

- Un compte **admin** : `demo@bpm-tools-demo.fr` / `Demo123!`
- Une quinzaine de **leads fictifs** (nouveau, appelé, clos, KO, etc.)

### 4. Déployer sur Vercel

- Crée un **nouveau projet** Vercel (ou une preview pour la branche `demo`).
- Branche à déployer : **demo**.
- Variables d’environnement à définir :
  - `NEXT_PUBLIC_SUPABASE_URL` → URL du projet Supabase **démo**
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon key du projet démo
  - `SUPABASE_SERVICE_ROLE_KEY` → service_role du projet démo
  - **`NEXT_PUBLIC_DEMO_MODE`** = **`true`** (affiche la bannière « Démo » et les identifiants sur la page de login)

Optionnel pour la démo : Resend, Stripe, etc. peuvent rester vides si tu ne testes pas les mails / paiements.

### 5. Résultat

- Les visiteurs voient la bannière **« Démo portfolio — données fictives »**.
- Sur la page de login, les identifiants démo sont affichés.
- Connexion avec `demo@bpm-tools-demo.fr` / `Demo123!` pour naviguer dans l’app avec les leads fictifs.

## Réinitialiser les données démo

Pour remettre des leads propres sans recréer le projet :

1. Dans Supabase (projet démo) : supprime les lignes de `leads` (et éventuellement `accounting_entries`, `lead_payments` si tu les utilises).
2. Relance : `node scripts/seed-demo.js` (le script ne recrée pas l’utilisateur s’il existe déjà, mais ajoute les leads si la table est vide).

## Lien portfolio

Tu peux utiliser l’URL de déploiement Vercel (ex. `bpm-tools-demo.vercel.app`) comme lien « Démo » dans ton portfolio.
