# Migration : Nouveaux statuts et système comptable

## Exécuter la migration

1. Allez dans votre **Supabase Dashboard**
2. Ouvrez le **SQL Editor**
3. Exécutez le script `supabase/migrations/005_update_status_and_add_payment_tracking.sql`

## Changements

### 1. Nouveaux statuts
Les statuts sont maintenant simplifiés :
- `nouveau` : Nouveau lead
- `appele` : Lead appelé
- `acompte_regle` : Acompte réglé
- `clos` : Closé (paiement complet)
- `ko` : KO

### 2. Système de paiement
- **Table `lead_payments`** : Suit les paiements (acompte, solde, complet)
- **Table `accounting_entries`** : Entrées comptables avec reste à payer

### 3. Fonctionnalités

#### Dans le CRM :
- **"Marquer appelé"** : Passe le statut de `nouveau` à `appele`
- **"Acompte réglé"** : Si prix acompte défini, crée une entrée comptable avec le reste à payer
- **"Paiement complet"** ou **"Solde réglé"** : Crée une entrée comptable pour le paiement complet ou le solde

#### Dans la Comptabilité :
- Affichage de toutes les entrées comptables
- Colonne **"Type"** : Acompte, Solde, ou Complet
- Colonne **"Reste à payer"** : Affiche le montant restant si acompte
- Calcul automatique des commissions (10% closer, 5% formateur)

## Utilisation

1. **Acompte réglé** :
   - Le lead doit avoir un `price_fixed` et un `price_deposit` définis
   - Cliquez sur "Acompte réglé" → Crée une entrée comptable avec le reste à payer

2. **Paiement complet** :
   - Si pas d'acompte : Cliquez sur "Paiement complet" directement depuis "Appelé"
   - Si acompte déjà réglé : Cliquez sur "Solde réglé" pour régler le reste

3. **Comptabilité** :
   - Toutes les entrées apparaissent automatiquement
   - Le reste à payer est calculé automatiquement

---

**Une fois la migration exécutée, le nouveau système de statuts et comptabilité sera actif !** ✅
