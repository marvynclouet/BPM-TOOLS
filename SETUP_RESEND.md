# Configuration Resend avec bpmformation.fr

## ✅ Ce qui est déjà fait

- Domaine `bpmformation.fr` ajouté dans Resend
- Package `resend` installé (v3.5.0)
- Code prêt à utiliser Resend

## 📋 Étapes restantes

### 1. Ajouter les enregistrements DNS

Dans votre registrar (là où vous avez acheté `bpmformation.fr`), ajoutez ces enregistrements DNS :

#### A. Vérification du domaine (DKIM)
**Type** : `TXT`  
**Nom** : `resend._domainkey`  
**Valeur** : 
```
p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDVzkySldgLRhiXQsa62RLUmLR4b6+6cJCNSn5Sn02C1y4OIRZkhB+JcgFCfaAsAzaWXYAaxQmuWMSdMp0jNRjxuIJIHgntWX2ibY+R1Id1d33Y3wEjFwqfxc958C4iQ8GYwEFgfDGM8rIJHIpVGIn4smnwbuSxjyOd5p5MUMBBvQIDAQAB
```
**TTL** : Auto (ou 3600)

#### B. Réception d'emails (MX)
**Type** : `MX`  
**Nom** : `send`  
**Valeur** : `feedback-smtp.eu-west-1.amazonses.com`  
**Priorité** : `10`  
**TTL** : Auto (ou 3600)

#### C. Protection SPF
**Type** : `TXT`  
**Nom** : `send`  
**Valeur** : 
```
v=spf1 include:amazonses.com ~all
```
**TTL** : Auto (ou 3600)

### 2. Vérifier le domaine dans Resend

1. Retournez sur https://resend.com/domains
2. Cliquez sur votre domaine `bpmformation.fr`
3. Attendez que tous les statuts passent à "✅ Verified" (peut prendre quelques minutes à quelques heures)

### 3. Obtenir votre clé API Resend

1. Allez sur https://resend.com/api-keys
2. Cliquez sur "Create API Key"
3. Donnez-lui un nom (ex: "BPM Tools Production")
4. Copiez la clé (commence par `re_...`)
5. ⚠️ **Important** : Sauvegardez-la, vous ne pourrez plus la voir après !

### 4. Configurer les variables d'environnement

Ajoutez dans votre fichier `.env.local` :

```bash
# Resend (pour envoi d'emails)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=BPM Formation <noreply@bpmformation.fr>
```

**Remplacez** `re_xxxxxxxxxxxxx` par votre vraie clé API.

### 5. Tester l'envoi

1. Redémarrez votre serveur : `npm run dev`
2. Allez dans "Gestion" → "Leads closés"
3. Cliquez sur "📧 Envoyer par email" pour un lead avec un email renseigné
4. Vérifiez que l'email arrive bien dans la boîte de réception

## 🔍 Vérification

### Dans Resend Dashboard
- Allez sur https://resend.com/emails
- Vous devriez voir les emails envoyés avec leur statut

### Logs
Si tout fonctionne, vous verrez dans la console :
```
✅ Email envoyé avec succès via Resend: [id]
```

## ⚠️ En cas de problème

### Domaine non vérifié
Si le domaine n'est pas encore vérifié, vous pouvez temporairement utiliser :
```bash
RESEND_FROM_EMAIL=BPM Formation <onboarding@resend.dev>
```

### Erreur d'envoi
- Vérifiez que `RESEND_API_KEY` est bien configuré
- Vérifiez que le domaine est vérifié dans Resend
- Vérifiez les logs dans la console pour plus de détails

## 📧 Format de l'email envoyé

L'email contiendra :
- **Sujet** : "Vos documents de formation - BPM Formation"
- **Expéditeur** : BPM Formation <noreply@bpmformation.fr>
- **Pièces jointes** :
  - `attestation-[Prénom]-[Année].pdf`
  - `facture-[Prénom]-[Année].pdf`
