# Configuration de l'envoi d'emails

## 📧 Actuellement

L'envoi d'email est **implémenté mais nécessite une configuration** avec **Resend**.

## 🚀 Configuration avec Resend (recommandé)

### 1. Créer un compte Resend

1. Allez sur https://resend.com
2. Créez un compte gratuit (100 emails/jour, 3000/mois)
3. Vérifiez votre domaine (ou utilisez le domaine de test fourni)

### 2. Obtenir votre clé API

1. Dans le dashboard Resend, allez dans "API Keys"
2. Créez une nouvelle clé API
3. Copiez la clé (commence par `re_...`)

### 3. Configurer les variables d'environnement

Ajoutez dans votre fichier `.env.local` :

```bash
# Resend (pour envoi d'emails)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=BPM Formation <noreply@bpmformation.fr>
```

**Important** : 
- Votre domaine `bpmformation.fr` est configuré dans Resend
- Assurez-vous d'avoir ajouté les enregistrements DNS dans votre registrar :
  - **TXT** pour la vérification du domaine (`resend._domainkey`)
  - **MX** pour la réception (`send` → `feedback-smtp.eu-west-1.amazonses.com`)
  - **TXT** pour SPF (`send` → `v=spf1 include:amazonses.com ~all`)

**Note** : Si le domaine n'est pas encore vérifié, vous pouvez temporairement utiliser :
```
RESEND_FROM_EMAIL=BPM Formation <onboarding@resend.dev>
```

### 4. Installer le package

```bash
npm install resend
```

### 5. Vérifier que ça fonctionne

1. Redémarrez votre serveur de développement
2. Allez dans "Gestion" → "Leads closés"
3. Cliquez sur "📧 Envoyer par email" pour un lead avec un email renseigné
4. L'email sera envoyé avec l'attestation et la facture en pièces jointes

## ⚠️ Mode développement

Si `RESEND_API_KEY` n'est pas configuré :
- En **développement** : L'email est simulé (logs dans la console)
- En **production** : Une erreur sera levée pour éviter les envois manqués

## 🔄 Alternatives

Si vous préférez un autre service :

### SendGrid
- Remplacez `resend` par `@sendgrid/mail`
- Modifiez `src/lib/communications.ts` pour utiliser SendGrid

### Supabase Edge Functions
- Créez une Edge Function Supabase
- Utilisez un service d'email dans la fonction
- Appelez la fonction depuis votre API route

## 📝 Notes

- Les emails sont envoyés avec l'attestation et la facture en PDF en pièces jointes
- Le champ `documents_sent_at` est mis à jour automatiquement après l'envoi
- L'indicateur "✅ Envoyé" apparaît dans l'interface une fois l'email envoyé
