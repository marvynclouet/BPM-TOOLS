# Vérification DNS pour bpmformation.fr

## ✅ Enregistrements DNS configurés dans Hostinger

D'après votre configuration, tous les enregistrements nécessaires sont en place :

### 1. DKIM (Domain Verification) ✅
- **Type** : `TXT`
- **Nom** : `resend._domainkey`
- **Valeur** : `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDVzkySldgLRhiXQsa62RLUmLR4b6+6cJCNSn5Sn02C1y4OIRZkhB+JcgFCfaAsAzaWXYAaxQmuWMSdMp0jNRjxuIJIHgntWX2ibY+R1Id1d33Y3wEjFwqfxc958C4iQ8GYwEFgfDGM8rIJHIpVGIn4smnwbuSxjyOd5p5MUMBBvQIDAQAB`
- **TTL** : 14400
- **Statut** : ✅ Configuré

### 2. SPF (Enable Sending) ✅
- **Type** : `TXT`
- **Nom** : `send`
- **Valeur** : `v=spf1 include:amazonses.com ~all`
- **TTL** : 3600
- **Statut** : ✅ Configuré

### 3. MX (Enable Receiving) ✅
- **Type** : `MX`
- **Nom** : `send`
- **Valeur** : `feedback-smtp.eu-west-1.amazonses.com`
- **Priorité** : `10`
- **TTL** : 3600
- **Statut** : ✅ Configuré

## ⏳ Prochaines étapes

### 1. Attendre la propagation DNS
Les enregistrements DNS peuvent prendre :
- **Minimum** : 5-15 minutes
- **Moyen** : 1-2 heures
- **Maximum** : 24-48 heures (rare)

### 2. Vérifier le statut dans Resend
1. Allez sur https://resend.com/domains
2. Cliquez sur votre domaine `bpmformation.fr`
3. Vérifiez que tous les statuts passent à "✅ Verified"

### 3. Tester l'envoi
Une fois que tous les statuts sont "✅ Verified" :

1. Assurez-vous que votre `.env.local` contient :
   ```bash
   RESEND_API_KEY=re_votre_cle_api
   RESEND_FROM_EMAIL=BPM Formation <noreply@bpmformation.fr>
   ```

2. Redémarrez votre serveur :
   ```bash
   npm run dev
   ```

3. Testez l'envoi d'email depuis "Gestion" → "Leads closés"

## 🔍 Vérification manuelle des DNS

Si vous voulez vérifier que les DNS sont bien propagés, utilisez ces commandes :

```bash
# Vérifier DKIM
dig TXT resend._domainkey.bpmformation.fr

# Vérifier SPF
dig TXT send.bpmformation.fr

# Vérifier MX
dig MX send.bpmformation.fr
```

Vous devriez voir les valeurs que vous avez configurées dans Hostinger.

## ⚠️ Notes importantes

- **Ne supprimez pas** les autres enregistrements DNS existants (Hostinger mail, etc.)
- Les enregistrements Resend sont **en plus** des autres, pas à la place
- Si après 24h le domaine n'est toujours pas vérifié, vérifiez :
  - Que les valeurs sont exactement comme indiqué (sans espaces supplémentaires)
  - Que le TTL est correct
  - Contactez le support Resend si nécessaire

## 🚀 Une fois vérifié

Une fois que le domaine est vérifié dans Resend, vous pourrez :
- Envoyer des emails depuis `noreply@bpmformation.fr`
- Recevoir les réponses (si configuré)
- Avoir une meilleure délivrabilité
