# Configuration des relances WhatsApp automatiques

## Option 1 : Vercel Cron (Recommandé)

Si vous déployez sur Vercel, le fichier `vercel.json` est déjà configuré pour exécuter les relances automatiquement toutes les 6 heures.

### Configuration

1. **Ajouter une variable d'environnement** dans Vercel :
   - `CRON_SECRET` : Un token secret pour sécuriser l'endpoint (ex: `your-secret-token-123`)

2. **Vérifier que le cron est activé** :
   - Allez dans Vercel Dashboard → Votre projet → Settings → Cron Jobs
   - Le cron devrait apparaître avec le schedule `0 */6 * * *` (toutes les 6 heures)

### Modifier la fréquence

Pour changer la fréquence, modifiez le `schedule` dans `vercel.json` :
- `0 */6 * * *` : Toutes les 6 heures
- `0 * * * *` : Toutes les heures
- `0 9,15 * * *` : À 9h et 15h chaque jour
- `0 9 * * *` : Tous les jours à 9h

## Option 2 : GitHub Actions (Alternative)

Si vous n'utilisez pas Vercel, vous pouvez utiliser GitHub Actions :

1. Créez `.github/workflows/whatsapp-relance.yml` :

```yaml
name: WhatsApp Relance Automatique

on:
  schedule:
    - cron: '0 */6 * * *'  # Toutes les 6 heures
  workflow_dispatch:  # Permet de déclencher manuellement

jobs:
  relance:
    runs-on: ubuntu-latest
    steps:
      - name: Envoyer les relances
        run: |
          curl -X POST https://votre-domaine.com/api/gestion/auto-relance \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

2. Ajoutez `CRON_SECRET` dans GitHub Secrets (Settings → Secrets → Actions)

## Option 3 : Supabase Edge Function (Alternative)

Vous pouvez aussi créer une Edge Function dans Supabase :

1. Créez `supabase/functions/auto-relance/index.ts`
2. Utilisez le même code que l'API route mais adapté pour Supabase
3. Configurez un cron dans Supabase Dashboard

## Option 4 : Service externe (cron-job.org, EasyCron, etc.)

1. Créez un compte sur un service de cron
2. Configurez une requête HTTP POST vers :
   - URL: `https://votre-domaine.com/api/gestion/auto-relance`
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`
   - Schedule: Toutes les 6 heures (ou selon vos besoins)

## Important

⚠️ **Note importante** : Les relances automatiques **ne peuvent pas ouvrir WhatsApp directement** depuis le serveur. Elles :
1. Vérifient quels leads ont besoin de relances
2. Enregistrent la date de la relance dans la base de données
3. Génèrent le lien WhatsApp

**Pour envoyer réellement les messages**, vous avez deux options :

### Option A : Notification au closer
- Afficher une notification dans l'interface quand une relance est due
- Le closer clique sur un bouton pour ouvrir WhatsApp

### Option B : WhatsApp Business API (Payant)
- Utiliser l'API officielle WhatsApp Business pour envoyer les messages automatiquement
- Nécessite un compte WhatsApp Business vérifié
- Coûte environ 0.005€ - 0.01€ par message

## Test manuel

Pour tester manuellement l'endpoint :

```bash
curl -X POST http://localhost:3000/api/gestion/auto-relance \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json"
```

Ou depuis le navigateur (après avoir configuré CRON_SECRET) :
- Créez une route de test ou utilisez un outil comme Postman
